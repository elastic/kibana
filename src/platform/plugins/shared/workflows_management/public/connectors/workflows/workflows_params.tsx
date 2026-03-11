/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { WorkflowSelectorWithProvider } from '@kbn/workflows-ui';
import type { WorkflowsActionParams } from './types';

const RUN_PER_ALERT_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workflows.runPerAlert.label',
  {
    defaultMessage: 'Run per alert',
  }
);

const RUN_PER_ALERT_HELP_TEXT = i18n.translate(
  'xpack.stackConnectors.components.workflows.runPerAlert.helpText',
  {
    defaultMessage: 'If enabled, it will be separate workflow for each alert detected',
  }
);

const WorkflowsParamsFields: React.FunctionComponent<ActionParamsProps<WorkflowsActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { workflowId, summaryMode = true } = actionParams.subActionParams ?? {};

  const handleWorkflowChange = useCallback(
    (newWorkflowId: string) => {
      editAction(
        'subActionParams',
        { ...actionParams.subActionParams, workflowId: newWorkflowId },
        index
      );
    },
    [editAction, index, actionParams.subActionParams]
  );

  const handleRunPerAlertChange = useCallback(
    (runPerAlert: boolean) => {
      // When switch is ON (runPerAlert = true), summaryMode should be false (run per alert)
      // When switch is OFF (runPerAlert = false), summaryMode should be true (summary mode)
      editAction(
        'subActionParams',
        { ...actionParams.subActionParams, summaryMode: !runPerAlert },
        index
      );
    },
    [editAction, index, actionParams.subActionParams]
  );

  // Ensure proper initialization of action parameters
  useEffect(() => {
    if (!actionParams?.subAction) {
      editAction('subAction', 'run', index);
    }
    if (!actionParams?.subActionParams) {
      editAction('subActionParams', { workflowId: '', summaryMode: true }, index);
    } else if (actionParams.subActionParams.summaryMode === undefined) {
      // Ensure summaryMode defaults to true for backward compatibility
      editAction('subActionParams', { ...actionParams.subActionParams, summaryMode: true }, index);
    }
  }, [actionParams, editAction, index]);

  const errorMessages = errors['subActionParams.workflowId'];
  const errorMessage = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
  const validationError = typeof errorMessage === 'string' ? errorMessage : undefined;

  // When summaryMode is false, runPerAlert is true (switch ON)
  // When summaryMode is true, runPerAlert is false (switch OFF)
  const runPerAlert = !summaryMode;

  return (
    <>
      <WorkflowSelectorWithProvider
        selectedWorkflowId={workflowId}
        onWorkflowChange={handleWorkflowChange}
        config={{
          sortFunction: (workflows) =>
            workflows.sort((a, b) => {
              const enabledDiff = Number(!!b.enabled) - Number(!!a.enabled);
              if (enabledDiff !== 0) return enabledDiff;

              const aHasAlert = a.definition?.triggers?.some((t) => t.type === 'alert');
              const bHasAlert = b.definition?.triggers?.some((t) => t.type === 'alert');
              if (aHasAlert && !bHasAlert) return -1;
              if (!aHasAlert && bHasAlert) return 1;
              return 0;
            }),
        }}
        error={validationError}
      />
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.stackConnectors.components.workflows.executionMode.label', {
                defaultMessage: 'Action frequency',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip content={RUN_PER_ALERT_HELP_TEXT} position="right" />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiSwitch
          label={RUN_PER_ALERT_LABEL}
          checked={runPerAlert}
          onChange={(e) => handleRunPerAlertChange(e.target.checked)}
          data-test-subj="workflow-run-per-alert-switch"
        />
      </EuiFormRow>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default WorkflowsParamsFields;
