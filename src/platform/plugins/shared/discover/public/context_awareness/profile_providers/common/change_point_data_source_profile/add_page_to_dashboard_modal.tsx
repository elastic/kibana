/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRadio,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { LensXYConfig, LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { LazyDashboardPicker, withSuspense } from '@kbn/presentation-util-plugin/public';
import type { NotificationsStart } from '@kbn/core/public';
import React, { useState } from 'react';
import { toChangePointDashboardPackages } from './add_page_to_dashboard_packages';

const DashboardPicker = withSuspense(LazyDashboardPicker);

export interface AddPageToDashboardModalProps {
  charts: ReadonlyArray<{
    config: LensXYConfig;
    description?: string;
  }>;
  esqlVariables?: ESQLControlVariable[];
  controlsState?: ControlPanelsState;
  canCreateNew: boolean;
  canEditExisting: boolean;
  dataViews: DataViewsContract;
  embeddable: EmbeddableStart;
  notifications: NotificationsStart;
  onClose: () => void;
}

export const AddPageToDashboardModal: React.FC<AddPageToDashboardModalProps> = ({
  charts,
  esqlVariables,
  controlsState,
  canCreateNew,
  canEditExisting,
  dataViews,
  embeddable,
  notifications,
  onClose,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const [dashboardOption, setDashboardOption] = useState<'new' | 'existing'>(
    canEditExisting ? 'existing' : 'new'
  );
  const [selectedDashboard, setSelectedDashboard] = useState<{ id: string; name: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const onConfirm = async () => {
    setIsSaving(true);
    try {
      const builtCharts = await Promise.all(
        charts.map(async ({ config, description }) => {
          const attributes = (await new LensConfigBuilder(dataViews).build(
            config
          )) as LensAttributes;
          if (description) {
            attributes.description = description;
          }
          return { attributes };
        })
      );

      const dashboardId = dashboardOption === 'new' ? 'new' : selectedDashboard?.id;
      if (!dashboardId) {
        setIsSaving(false);
        return;
      }

      await embeddable.getStateTransfer().navigateToWithEmbeddablePackages('dashboards', {
        path: dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`,
        state: toChangePointDashboardPackages({
          charts: builtCharts,
          esqlVariables,
          controlsState,
        }),
      });
      onClose();
    } catch {
      notifications.toasts.addDanger({
        title: i18n.translate('discover.changePoint.addToDashboard.buildError', {
          defaultMessage: 'Unable to add charts to the dashboard.',
        }),
      });
      setIsSaving(false);
    }
  };

  const confirmDisabled =
    isSaving || (dashboardOption === 'existing' && selectedDashboard === null);

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={isSaving ? () => undefined : onClose}
      data-test-subj="changePointAddPageToDashboardModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('discover.changePoint.addToDashboard.modalTitle', {
            defaultMessage: 'Add to dashboard',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="discover.changePoint.addToDashboard.modalDescription"
              defaultMessage="{count, plural, one {Add # chart from this page.} other {Add # charts from this page.}}"
              values={{ count: charts.length }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        {canEditExisting ? (
          <>
            <EuiRadio
              checked={dashboardOption === 'existing'}
              id="changePointExistingDashboard"
              name="changePointDashboardOption"
              label={i18n.translate('discover.changePoint.addToDashboard.existingDashboard', {
                defaultMessage: 'Existing dashboard',
              })}
              onChange={() => setDashboardOption('existing')}
              disabled={isSaving}
            />
            <EuiSpacer size="s" />
            <DashboardPicker
              isDisabled={isSaving || dashboardOption !== 'existing'}
              onChange={(dashboard) => {
                setSelectedDashboard(dashboard);
                setDashboardOption('existing');
              }}
            />
            <EuiSpacer size="m" />
          </>
        ) : null}
        {canCreateNew ? (
          <EuiRadio
            checked={dashboardOption === 'new'}
            data-test-subj="changePointNewDashboardOption"
            id="changePointNewDashboard"
            name="changePointDashboardOption"
            label={i18n.translate('discover.changePoint.addToDashboard.newDashboard', {
              defaultMessage: 'New dashboard',
            })}
            onChange={() => setDashboardOption('new')}
            disabled={isSaving}
          />
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onClose}
          isDisabled={isSaving}
          data-test-subj="changePointAddPageCancel"
        >
          {i18n.translate('discover.changePoint.addToDashboard.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={onConfirm}
          isLoading={isSaving}
          isDisabled={confirmDisabled}
          data-test-subj="changePointAddPageConfirm"
        >
          {i18n.translate('discover.changePoint.addToDashboard.confirm', {
            defaultMessage: 'Add charts',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
