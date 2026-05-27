/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSplitPanel,
  EuiSwitch,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IUiSettingsClient, ToastsStart } from '@kbn/core/public';
import type { UiSettingsScope } from '@kbn/core-ui-settings-common';
import {
  WORKFLOW_SHOW_SYSTEM_EXECUTIONS_SETTING_ID,
  WORKFLOW_SHOW_SYSTEM_WORKFLOWS_SETTING_ID,
} from '@kbn/workflows/common/constants';

interface SystemWorkflowSettingsSectionProps {
  uiSettings: IUiSettingsClient;
  toasts: ToastsStart;
  enableSaving: Record<UiSettingsScope, boolean>;
}

export function SystemWorkflowSettingsSection({
  uiSettings,
  toasts,
  enableSaving,
}: SystemWorkflowSettingsSectionProps) {
  const canSave = enableSaving.namespace ?? enableSaving.global ?? false;
  const {
    euiTheme: { size },
  } = useEuiTheme();

  const panelCSS = css`
    & + & {
      margin-top: ${size.l};
    }
  `;

  const rowCSS = css`
    + * {
      margin-top: ${size.base};
    }
  `;

  const [showSystemWorkflows, setShowSystemWorkflows] = useState<boolean>(
    uiSettings.get(WORKFLOW_SHOW_SYSTEM_WORKFLOWS_SETTING_ID, false)
  );
  const [showSystemExecutions, setShowSystemExecutions] = useState<boolean>(
    uiSettings.get(WORKFLOW_SHOW_SYSTEM_EXECUTIONS_SETTING_ID, false)
  );

  useEffect(() => {
    const sub = uiSettings.getUpdate$().subscribe(({ key, newValue }) => {
      if (key === WORKFLOW_SHOW_SYSTEM_WORKFLOWS_SETTING_ID) {
        setShowSystemWorkflows(newValue as boolean);
      }
      if (key === WORKFLOW_SHOW_SYSTEM_EXECUTIONS_SETTING_ID) {
        setShowSystemExecutions(newValue as boolean);
      }
    });
    return () => sub.unsubscribe();
  }, [uiSettings]);

  const handleToggle = useCallback(
    async (settingId: string, value: boolean, setter: (v: boolean) => void) => {
      setter(value);
      try {
        await uiSettings.set(settingId, value);
      } catch (err) {
        setter(!value);
        toasts.addError(err, {
          title: i18n.translate('workflowsManagement.systemSettings.saveError', {
            defaultMessage: 'Failed to save setting',
          }),
        });
      }
    },
    [uiSettings, toasts]
  );

  return (
    <EuiSplitPanel.Outer hasBorder css={panelCSS}>
      <EuiSplitPanel.Inner color="subdued">
        <EuiFlexGroup alignItems="baseline">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="workflowsManagement.systemSettings.sectionTitle"
                  defaultMessage="Workflows"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <EuiCallOut
          title={i18n.translate('workflowsManagement.systemSettings.callout.title', {
            defaultMessage: 'System workflow settings',
          })}
          color="warning"
          iconType="warning"
        >
          <p>
            <FormattedMessage
              id="workflowsManagement.systemSettings.callout.body"
              defaultMessage="System workflows are managed by Elastic and power core platform features. Editing, disabling, or deleting them may cause unexpected behaviour or break product functionality. Enable these settings only if you know what you are doing."
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="l" />
        <EuiDescribedFormGroup
          css={rowCSS}
          fullWidth
          title={
            <h3>
              <FormattedMessage
                id="workflowsManagement.systemSettings.showSystemWorkflows.label"
                defaultMessage="Show system workflows"
              />
            </h3>
          }
          description={
            <FormattedMessage
              id="workflowsManagement.systemSettings.showSystemWorkflows.help"
              defaultMessage="Display internal system workflows in the Workflows list."
            />
          }
        >
          <EuiFormRow fullWidth label={WORKFLOW_SHOW_SYSTEM_WORKFLOWS_SETTING_ID}>
            <EuiSwitch
              label={i18n.translate(
                'workflowsManagement.systemSettings.showSystemWorkflows.switchLabel',
                { defaultMessage: 'Show system workflows' }
              )}
              checked={showSystemWorkflows}
              disabled={!canSave}
              onChange={(e) =>
                handleToggle(
                  WORKFLOW_SHOW_SYSTEM_WORKFLOWS_SETTING_ID,
                  e.target.checked,
                  setShowSystemWorkflows
                )
              }
              data-test-subj="workflowsShowSystemWorkflowsToggle"
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        <EuiDescribedFormGroup
          css={rowCSS}
          fullWidth
          title={
            <h3>
              <FormattedMessage
                id="workflowsManagement.systemSettings.showSystemExecutions.label"
                defaultMessage="Show system workflow executions"
              />
            </h3>
          }
          description={
            <FormattedMessage
              id="workflowsManagement.systemSettings.showSystemExecutions.help"
              defaultMessage="Display execution history for internal system workflows."
            />
          }
        >
          <EuiFormRow fullWidth label={WORKFLOW_SHOW_SYSTEM_EXECUTIONS_SETTING_ID}>
            <EuiSwitch
              label={i18n.translate(
                'workflowsManagement.systemSettings.showSystemExecutions.switchLabel',
                { defaultMessage: 'Show system workflow executions' }
              )}
              checked={showSystemExecutions}
              disabled={!canSave}
              onChange={(e) =>
                handleToggle(
                  WORKFLOW_SHOW_SYSTEM_EXECUTIONS_SETTING_ID,
                  e.target.checked,
                  setShowSystemExecutions
                )
              }
              data-test-subj="workflowsShowSystemExecutionsToggle"
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}
