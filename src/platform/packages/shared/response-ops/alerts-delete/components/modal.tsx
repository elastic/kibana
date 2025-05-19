/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiForm,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiCheckbox,
  EuiFormRow,
  EuiSelectOption,
  EuiHorizontalRule,
  EuiFieldText,
  EuiPanel,
} from '@elastic/eui';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { HttpStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertDeleteCategoryIds } from '@kbn/alerting-plugin/common/constants/alert_delete';
import * as i18n from '../translations';
import { ModalThresholdSelector as ThresholdSelector } from './modal_threshold_selector';
import {
  DEFAULT_THRESHOLD,
  DEFAULT_THRESHOLD_ENABLED,
  DEFAULT_THRESHOLD_UNIT,
  MAX_THRESHOLD_DAYS,
  MIN_THRESHOLD_DAYS,
  THRESHOLD_UNITS,
} from '../constants';
import { useAlertDeletePreview } from '../api/preview/use_alert_delete_preview';
import { useAlertDeleteSchedule } from '../api/schedule/use_alert_delete_schedule';

const FORM_ID = 'alert-delete-settings';
const MODAL_ID = 'alert-delete-modal';

const getThresholdInDays = (threshold: number, thresholdUnit: EuiSelectOption) => {
  switch (thresholdUnit.value) {
    case 'days':
      return threshold;
    case 'months':
      return threshold * 30;
    case 'years':
      return threshold * 365;
    default:
      return 0;
  }
};

interface PreviewMessageProps {
  activeStateChecked: boolean;
  inactiveStateChecked: boolean;
  previewAffectedAlertsCount: number | undefined;
  isValidThreshold: boolean;
}
const PreviewMessage = ({
  activeStateChecked,
  inactiveStateChecked,
  previewAffectedAlertsCount,
  isValidThreshold,
}: PreviewMessageProps) => {
  if ((!activeStateChecked && !inactiveStateChecked) || previewAffectedAlertsCount === undefined) {
    return (
      <FormattedMessage
        id="responseOpsAlertDelete.previewInitial"
        defaultMessage="Select the type of alerts you wish to delete"
      />
    );
  }

  if (previewAffectedAlertsCount === 0) {
    return (
      <FormattedMessage
        id="responseOpsAlertDelete.previewEmpty"
        defaultMessage="No alerts match the selected criteria."
      />
    );
  }

  if (!isValidThreshold) {
    return (
      <FormattedMessage
        id="responseOpsAlertDelete.previewDisabled"
        defaultMessage="Affected alerts preview is disabled because the threshold is invalid."
      />
    );
  }

  return (
    <FormattedMessage
      id="responseOpsAlertDelete.preview"
      defaultMessage="This action will permanently delete a total of <strong>{count} {count, plural, one {alert} other {alerts}}</strong> and you won't be able to restore them."
      values={{
        strong: (chunks) => <strong>{chunks}</strong>,
        count: previewAffectedAlertsCount,
      }}
    />
  );
};

const getThresholdErrorMessages = (threshold: number, thresholdUnit: EuiSelectOption) => {
  const thresholdInDays = getThresholdInDays(threshold, thresholdUnit);
  const errorMessages = [];
  if (thresholdInDays < MIN_THRESHOLD_DAYS) {
    errorMessages.push(i18n.THRESHOLD_ERROR_MIN);
  }
  if (thresholdInDays > MAX_THRESHOLD_DAYS) {
    errorMessages.push(i18n.THRESHOLD_ERROR_MAX);
  }
  return errorMessages;
};

export interface AlertDeleteProps {
  services: { http: HttpStart; notifications: NotificationsStart };
  categoryIds: AlertDeleteCategoryIds[];
  onCloseModal: () => void;
  isVisible: boolean;
  isDisabled?: boolean;
}
export const AlertDeleteModal = ({
  services: { http, notifications },
  categoryIds,
  onCloseModal,
  isVisible,
  isDisabled = false,
}: AlertDeleteProps) => {
  const [activeState, setActiveState] = useState({
    checked: DEFAULT_THRESHOLD_ENABLED,
    threshold: DEFAULT_THRESHOLD,
    thresholdUnit: DEFAULT_THRESHOLD_UNIT,
  });

  const [inactiveState, setInactiveState] = useState({
    checked: DEFAULT_THRESHOLD_ENABLED,
    threshold: DEFAULT_THRESHOLD,
    thresholdUnit: DEFAULT_THRESHOLD_UNIT,
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const errorMessages = {
    activeThreshold: getThresholdErrorMessages(activeState.threshold, activeState.thresholdUnit),
    inactiveThreshold: getThresholdErrorMessages(
      inactiveState.threshold,
      inactiveState.thresholdUnit
    ),
  };

  const validations = {
    isActiveThresholdValid: errorMessages.activeThreshold.length === 0,
    isInactiveThresholdValid: errorMessages.inactiveThreshold.length === 0,
    isDeleteConfirmationValid:
      deleteConfirmation === i18n.DELETE_PASSKEY || deleteConfirmation.length === 0,
  };

  const isValidThreshold =
    validations.isActiveThresholdValid && validations.isInactiveThresholdValid;

  const {
    data: { affectedAlertCount: previewAffectedAlertsCount } = { affectedAlertCount: undefined },
  } = useAlertDeletePreview({
    services: {
      http,
    },
    isEnabled: isValidThreshold,
    queryParams: {
      activeAlertDeleteThreshold: activeState.checked
        ? getThresholdInDays(activeState.threshold, activeState.thresholdUnit)
        : undefined,
      inactiveAlertDeleteThreshold: inactiveState.checked
        ? getThresholdInDays(inactiveState.threshold, inactiveState.thresholdUnit)
        : undefined,
      categoryIds,
    },
  });

  const { mutate: createAlertDeleteSchedule } = useAlertDeleteSchedule({
    services: { http },
    onSuccess: () => {
      notifications.toasts.addSuccess(i18n.ALERT_DELETE_SUCCESS);
      onClose();
    },
    onError: (error: IHttpFetchError<ResponseErrorBody>) => {
      notifications.toasts.addDanger({
        title: i18n.ALERT_DELETE_FAILURE,
        text: error.body?.message || i18n.UNKNOWN_ERROR,
      });
    },
  });

  const currentSettingsWouldDeleteAlerts =
    (activeState.checked || inactiveState.checked) &&
    previewAffectedAlertsCount &&
    previewAffectedAlertsCount > 0;

  const isFormValid =
    validations.isDeleteConfirmationValid &&
    validations.isActiveThresholdValid &&
    validations.isInactiveThresholdValid &&
    deleteConfirmation.length > 0 &&
    currentSettingsWouldDeleteAlerts;

  const activeAlertsCallbacks = {
    onChangeEnabled: (e: React.ChangeEvent<HTMLInputElement>) => {
      setActiveState((prev) => ({ ...prev, checked: e.target.checked }));
    },
    onChangeThreshold: (e: React.ChangeEvent<HTMLInputElement>) => {
      setActiveState((prev) => ({ ...prev, threshold: Number(e.target.value) }));
    },
    onChangeThresholdUnit: (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedValue = THRESHOLD_UNITS.find((option) => option.text === e.target.value);
      if (selectedValue) {
        setActiveState((prev) => ({ ...prev, thresholdUnit: selectedValue }));
      }
    },
  };

  const inactiveAlertsCallbacks = {
    onChangeEnabled: (e: React.ChangeEvent<HTMLInputElement>) => {
      setInactiveState((prev) => ({ ...prev, checked: e.target.checked }));
    },
    onChangeThreshold: (e: React.ChangeEvent<HTMLInputElement>) => {
      setInactiveState((prev) => ({ ...prev, threshold: Number(e.target.value) }));
    },
    onChangeThresholdUnit: (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedValue = THRESHOLD_UNITS.find((option) => option.text === e.target.value);
      if (selectedValue) {
        setInactiveState((prev) => ({ ...prev, thresholdUnit: selectedValue }));
      }
    },
  };

  const onChangeDeleteConfirmation = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeleteConfirmation(e.target.value);
  };

  const onScheduleCleanUpTask = (ev: React.FormEvent) => {
    ev.preventDefault();

    createAlertDeleteSchedule({
      activeAlertDeleteThreshold: validations.isActiveThresholdValid
        ? getThresholdInDays(activeState.threshold, activeState.thresholdUnit)
        : undefined,
      inactiveAlertDeleteThreshold: validations.isInactiveThresholdValid
        ? getThresholdInDays(inactiveState.threshold, inactiveState.thresholdUnit)
        : undefined,
    });
  };

  const onClose = () => {
    setActiveState({
      checked: DEFAULT_THRESHOLD_ENABLED,
      threshold: DEFAULT_THRESHOLD,
      thresholdUnit: DEFAULT_THRESHOLD_UNIT,
    });

    setInactiveState({
      checked: DEFAULT_THRESHOLD_ENABLED,
      threshold: DEFAULT_THRESHOLD,
      thresholdUnit: DEFAULT_THRESHOLD_UNIT,
    });

    setDeleteConfirmation('');

    onCloseModal();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <EuiModal aria-labelledby={MODAL_ID} onClose={onClose} data-test-subj="alert-delete-modal">
      <EuiForm id={FORM_ID} component="form">
        <EuiModalHeader>
          <EuiModalHeaderTitle id={MODAL_ID}>{i18n.MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <p>{i18n.MODAL_DESCRIPTION}</p>
          <EuiSpacer size="l" />

          <EuiPanel hasShadow={false} hasBorder color="subdued" id="alert-delete-active-panel">
            <EuiCheckbox
              id="alert-delete-active"
              data-test-subj="alert-delete-active-checkbox"
              checked={activeState.checked}
              disabled={isDisabled}
              onChange={activeAlertsCallbacks.onChangeEnabled}
              labelProps={{ css: 'width: 100%' }}
              label={
                <ThresholdSelector
                  title={i18n.ACTIVE_ALERTS}
                  description={i18n.ACTIVE_ALERTS_DESCRIPTION}
                  threshold={activeState.threshold}
                  thresholdUnit={activeState.thresholdUnit}
                  onChangeThreshold={activeAlertsCallbacks.onChangeThreshold}
                  onChangeThresholdUnit={activeAlertsCallbacks.onChangeThresholdUnit}
                  isInvalid={!validations.isActiveThresholdValid}
                  isDisabled={!activeState.checked || isDisabled}
                  error={errorMessages.activeThreshold}
                  thresholdTestSubj="alert-delete-active-threshold"
                  thresholdUnitTestSubj="alert-delete-active-threshold-unit"
                />
              }
            />
          </EuiPanel>
          <EuiSpacer size="m" />

          <EuiPanel hasShadow={false} hasBorder color="subdued">
            <EuiCheckbox
              id="alert-delete-inactive"
              data-test-subj="alert-delete-inactive-checkbox"
              checked={inactiveState.checked}
              disabled={isDisabled}
              onChange={inactiveAlertsCallbacks.onChangeEnabled}
              labelProps={{ css: 'width: 100%' }}
              label={
                <ThresholdSelector
                  title={i18n.INACTIVE_ALERTS}
                  description={i18n.INACTIVE_ALERTS_DESCRIPTION}
                  threshold={inactiveState.threshold}
                  thresholdUnit={inactiveState.thresholdUnit}
                  onChangeThreshold={inactiveAlertsCallbacks.onChangeThreshold}
                  onChangeThresholdUnit={inactiveAlertsCallbacks.onChangeThresholdUnit}
                  isInvalid={!validations.isInactiveThresholdValid}
                  isDisabled={!inactiveState.checked || isDisabled}
                  error={errorMessages.inactiveThreshold}
                  thresholdTestSubj="alert-delete-inactive-threshold"
                  thresholdUnitTestSubj="alert-delete-inactive-threshold-unit"
                />
              }
            />
          </EuiPanel>

          <EuiHorizontalRule />

          <p data-test-subj="alert-delete-preview-message">
            <PreviewMessage
              activeStateChecked={activeState.checked}
              inactiveStateChecked={inactiveState.checked}
              previewAffectedAlertsCount={previewAffectedAlertsCount}
              isValidThreshold={isValidThreshold}
            />
          </p>
          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.DELETE_CONFIRMATION}
            fullWidth
            isInvalid={!validations.isDeleteConfirmationValid}
          >
            <EuiFieldText
              value={deleteConfirmation}
              disabled={isDisabled || !currentSettingsWouldDeleteAlerts}
              onChange={onChangeDeleteConfirmation}
              data-test-subj="alert-delete-delete-confirmation"
            />
          </EuiFormRow>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose} data-test-subj="alert-delete-modal-cancel">
            {i18n.MODAL_CANCEL}
          </EuiButtonEmpty>
          <EuiButton
            type="submit"
            form={FORM_ID}
            fill
            color="danger"
            isDisabled={!isFormValid || isDisabled}
            data-test-subj="alert-delete-submit"
            onClick={onScheduleCleanUpTask}
          >
            {i18n.MODAL_SUBMIT}
          </EuiButton>
        </EuiModalFooter>
      </EuiForm>
    </EuiModal>
  );
};

// Needed for lazy import
// eslint-disable-next-line import/no-default-export
export default AlertDeleteModal;
