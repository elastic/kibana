/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCheckboxGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import type { EuiCheckboxGroupOption } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { isSiemRuleType } from '@kbn/rule-data-utils';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { WorkflowSelectorWithProvider } from '@kbn/workflows-ui';
import type { AlertStateId, AlertStates, WorkflowsActionParams } from './types';

const RUN_WORKFLOW_FOR_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workflows.runWorkflowFor.label',
  {
    defaultMessage: 'Run workflow for',
  }
);

const RUN_WORKFLOW_FOR_HELP_TEXT = i18n.translate(
  'xpack.stackConnectors.components.workflows.runWorkflowFor.helpText',
  {
    defaultMessage: 'Select which alert states should trigger this workflow',
  }
);

const ALERT_STATE_OPTIONS: EuiCheckboxGroupOption[] = [
  {
    id: 'new',
    label: i18n.translate('xpack.stackConnectors.components.workflows.alertState.new', {
      defaultMessage: 'New alerts',
    }),
  },
  {
    id: 'ongoing',
    label: i18n.translate('xpack.stackConnectors.components.workflows.alertState.ongoing', {
      defaultMessage: 'Ongoing alerts',
    }),
  },
  {
    id: 'recovered',
    label: i18n.translate('xpack.stackConnectors.components.workflows.alertState.recovered', {
      defaultMessage: 'Recovered alerts',
    }),
  },
];

const DEFAULT_ALERT_STATES: AlertStates = {
  new: true,
  ongoing: false,
  recovered: false,
};

const normalizeAlertStates = (partial?: Partial<AlertStates>): AlertStates => ({
  ...DEFAULT_ALERT_STATES,
  ...partial,
});

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
  ruleTypeId,
}) => {
  // Security detection rules only produce "new" alerts and have no concept of
  // "ongoing" or "recovered" states, so the alert-state checkboxes are hidden.
  const isDetectionRule = ruleTypeId ? isSiemRuleType(ruleTypeId) : false;
  const { workflowId, summaryMode = true } = actionParams.subActionParams ?? {};
  const alertStates = normalizeAlertStates(actionParams.subActionParams?.alertStates);

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
      editAction(
        'subActionParams',
        { ...actionParams.subActionParams, summaryMode: !runPerAlert },
        index
      );
    },
    [editAction, index, actionParams.subActionParams]
  );

  const handleAlertStateChange = useCallback(
    (optionId: string) => {
      const stateId = optionId as AlertStateId;
      const currentStates = normalizeAlertStates(actionParams.subActionParams?.alertStates);
      editAction(
        'subActionParams',
        {
          ...actionParams.subActionParams,
          alertStates: {
            ...currentStates,
            [stateId]: !currentStates[stateId],
          },
        },
        index
      );
    },
    [editAction, index, actionParams.subActionParams]
  );

  useEffect(() => {
    if (!actionParams?.subAction) {
      editAction('subAction', 'run', index);
    }
    if (!actionParams?.subActionParams) {
      editAction(
        'subActionParams',
        { workflowId: '', summaryMode: true, alertStates: DEFAULT_ALERT_STATES },
        index
      );
    } else {
      let nextSubActionParams = actionParams.subActionParams;
      let needsUpdate = false;

      if (nextSubActionParams.summaryMode === undefined) {
        nextSubActionParams = { ...nextSubActionParams, summaryMode: true };
        needsUpdate = true;
      }

      const mergedAlertStates = normalizeAlertStates(nextSubActionParams.alertStates);
      if (
        !nextSubActionParams.alertStates ||
        nextSubActionParams.alertStates.new !== mergedAlertStates.new ||
        nextSubActionParams.alertStates.ongoing !== mergedAlertStates.ongoing ||
        nextSubActionParams.alertStates.recovered !== mergedAlertStates.recovered
      ) {
        nextSubActionParams = { ...nextSubActionParams, alertStates: mergedAlertStates };
        needsUpdate = true;
      }

      if (needsUpdate) {
        editAction('subActionParams', nextSubActionParams, index);
      }
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
      {!isDetectionRule && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                <EuiFlexItem grow={false}>{RUN_WORKFLOW_FOR_LABEL}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip content={RUN_WORKFLOW_FOR_HELP_TEXT} position="right" />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiCheckboxGroup
              options={ALERT_STATE_OPTIONS}
              idToSelectedMap={alertStates}
              onChange={handleAlertStateChange}
              legend={{ children: RUN_WORKFLOW_FOR_LABEL, display: 'hidden' }}
              data-test-subj="workflow-alert-state-checkboxes"
            />
          </EuiFormRow>
        </>
      )}
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
