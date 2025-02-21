/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import {
  EuiDescribedFormGroup,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiPanel,
  EuiSkeletonRectangle,
} from '@elastic/eui';
import type { RulesSettingsAlertDeletionProperties } from '@kbn/alerting-types/rule_settings';
import type { HttpStart } from '@kbn/core/public';
import * as i18n from './translations';
import { useFetchAlertsDeletionPreview } from '../../common/hooks/alert_deletion/use_fetch_alert_deletion_preview';

interface Props {
  onChange: (key: keyof RulesSettingsAlertDeletionProperties, value: number | boolean) => void;
  settings?: RulesSettingsAlertDeletionProperties;
  canWrite: boolean;
  hasError: boolean;
  http: HttpStart;
}
export const RulesSettingsAlertsDeletionSection = (props: Props) => {
  const { onChange, settings, hasError, canWrite, http } = props;

  // TODO: debounce needed?
  const {
    isLoading: isLoadingPreview,
    isValid: isValidPreview,
    data: previewData,
  } = useFetchAlertsDeletionPreview({
    http,
    enabled: true,
    settings,
  });

  // TODO: initial fetching must be done here
  // TODO: error
  if (hasError || !settings) {
    return (
      <EuiEmptyPrompt
        data-test-subj="rulesSettingsAlertDeletionErrorPrompt"
        color="danger"
        iconType="warning"
        title={<h4>{i18n.ALERT_DELETION_ERROR_PROMPT_TITLE}</h4>}
        body={<p>{i18n.ALERT_DELETION_ERROR_PROMPT_BODY}</p>}
      />
    );
  }

  return (
    <EuiForm data-test-subj="rulesSettingsAlertDeletionSection">
      <EuiDescribedFormGroup
        title={<h3>{i18n.ALERT_DELETION_TITLE}</h3>}
        description={
          <>
            <EuiText color="subdued" size="s">
              <p>{i18n.ALERT_DELETION_DESCRIPTION}</p>
            </EuiText>
            <EuiSpacer size="xl" />
            {/* // TODO: https://github.com/elastic/kibana/issues/209267
            <EuiPanel borderRadius="none" color="subdued">
              <FormattedMessage
                id="xpack.triggersActionsUI.rulesSettings.AlertDeletionLastRun"
                defaultMessage={`Last run was 2 days ago.`}
              />
            </EuiPanel> */}
          </>
        }
      >
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFormRow label={i18n.ACTIVE_ALERT_DELETION_LABEL}>
              <EuiSwitch
                data-test-subj="rulesSettingsActiveAlertDeletionSwitch"
                label=""
                checked={settings!.isActiveAlertsDeletionEnabled}
                disabled={!canWrite}
                onChange={(e) => {
                  onChange('isActiveAlertsDeletionEnabled', e.target.checked);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow label={i18n.THRESHOLD_LABEL}>
              <EuiFieldNumber
                data-test-subj="rulesSettingsActiveAlertDeletionThreshold"
                value={settings!.activeAlertsDeletionThreshold}
                onChange={(e) => {
                  onChange('activeAlertsDeletionThreshold', parseInt(e.target.value, 10));
                }}
                append={[i18n.DAYS_LABEL]}
                disabled={!canWrite || !settings!.isActiveAlertsDeletionEnabled}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFormRow label={i18n.INACTIVE_ALERT_DELETION_LABEL}>
              <EuiSwitch
                data-test-subj="rulesSettingsInactiveAlertDeletionSwitch"
                label=""
                checked={settings!.isInactiveAlertsDeletionEnabled}
                disabled={!canWrite}
                onChange={(e) => {
                  onChange('isInactiveAlertsDeletionEnabled', e.target.checked);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow label="Threshold">
              <EuiFieldNumber
                data-test-subj="rulesSettingsInactiveAlertDeletionThreshold"
                value={settings!.inactiveAlertsDeletionThreshold}
                onChange={(e) => {
                  onChange('inactiveAlertsDeletionThreshold', parseInt(e.target.value, 10));
                }}
                append={[i18n.DAYS_LABEL]}
                disabled={!canWrite || !settings!.isInactiveAlertsDeletionEnabled}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        {isValidPreview && (
          <>
            <EuiSpacer size="m" />
            <EuiSkeletonRectangle
              isLoading={isLoadingPreview}
              contentAriaLabel={i18n.ALERT_DELETION_AFFECTED_ALERTS_ARIA}
              width={'100%'}
              height={48}
              borderRadius="none"
            >
              <EuiPanel borderRadius="none" color="subdued">
                {i18n.ALERT_DELETION_AFFECTED_ALERTS(previewData!.affectedAlertCount)}
              </EuiPanel>
            </EuiSkeletonRectangle>
          </>
        )}
      </EuiDescribedFormGroup>
    </EuiForm>
  );
};
