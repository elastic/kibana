/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
  EuiSuperSelect,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { WorkflowSelectorWithProvider } from '@kbn/workflows-ui';
import type { WorkflowsActionParams } from './types';

const FOR_EACH_ALERT = i18n.translate('xpack.stackConnectors.components.workflows.forEachAlert', {
  defaultMessage: 'For each alert',
});

const SUMMARY_OF_ALERTS = i18n.translate(
  'xpack.stackConnectors.components.workflows.summaryOfAlerts',
  {
    defaultMessage: 'Summary of alerts',
  }
);

const WorkflowsParamsFields: React.FunctionComponent<ActionParamsProps<WorkflowsActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { workflowId, summary = true } = actionParams.subActionParams ?? {};
  const [summaryMenuOpen, setSummaryMenuOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

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

  const selectSummaryOption = useCallback(
    (summaryValue: boolean) => {
      editAction(
        'subActionParams',
        { ...actionParams.subActionParams, summary: summaryValue },
        index
      );
      setSummaryMenuOpen(false);
    },
    [editAction, index, actionParams.subActionParams]
  );

  // Ensure proper initialization of action parameters
  useEffect(() => {
    if (!actionParams?.subAction) {
      editAction('subAction', 'run', index);
    }
    if (!actionParams?.subActionParams) {
      editAction('subActionParams', { workflowId: '', summary: true }, index);
    } else if (actionParams.subActionParams.summary === undefined) {
      // Ensure summary defaults to true for backward compatibility
      editAction('subActionParams', { ...actionParams.subActionParams, summary: true }, index);
    }
  }, [actionParams, editAction, index]);

  const errorMessages = errors['subActionParams.workflowId'];
  const errorMessage = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
  const validationError = typeof errorMessage === 'string' ? errorMessage : undefined;

  const summaryContextMenuOptionStyles = useMemo(
    () => css`
      min-width: 300px;
      padding: ${euiTheme.size.s};
    `,
    [euiTheme]
  );

  const summaryOptions = useMemo(
    () => [
      <EuiContextMenuItem
        key="summary"
        onClick={() => selectSummaryOption(true)}
        icon={summary ? 'check' : 'empty'}
        id="workflow-execution-mode-option-summary"
        data-test-subj="workflow-execution-mode-option-summary"
        className={summaryContextMenuOptionStyles}
      >
        {SUMMARY_OF_ALERTS}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="for_each"
        onClick={() => selectSummaryOption(false)}
        icon={!summary ? 'check' : 'empty'}
        id="workflow-execution-mode-option-for_each"
        data-test-subj="workflow-execution-mode-option-for_each"
        className={summaryContextMenuOptionStyles}
      >
        {FOR_EACH_ALERT}
      </EuiContextMenuItem>,
    ],
    [summary, selectSummaryOption, summaryContextMenuOptionStyles]
  );

  const PER_RULE_RUN = i18n.translate('xpack.stackConnectors.components.workflows.perRuleRun', {
    defaultMessage: 'Per rule run',
  });

  const summaryOrPerRuleSelect = (
    <EuiPopover
      data-test-subj="workflow-execution-mode-select"
      initialFocus={`#workflow-execution-mode-option-${summary ? 'summary' : 'for_each'}`}
      isOpen={summaryMenuOpen}
      closePopover={useCallback(() => setSummaryMenuOpen(false), [setSummaryMenuOpen])}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      aria-label={summary ? SUMMARY_OF_ALERTS : FOR_EACH_ALERT}
      aria-roledescription={i18n.translate(
        'xpack.stackConnectors.components.workflows.executionMode.roleDescription',
        { defaultMessage: 'Workflow execution mode select' }
      )}
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="arrowDown"
          iconSide="right"
          onClick={useCallback(() => setSummaryMenuOpen(!summaryMenuOpen), [summaryMenuOpen])}
        >
          {summary ? SUMMARY_OF_ALERTS : FOR_EACH_ALERT}
        </EuiButtonEmpty>
      }
    >
      <EuiContextMenuPanel items={summaryOptions} />
    </EuiPopover>
  );

  const perRuleRunOptions = useMemo(
    () => [
      {
        value: 'perRuleRun',
        inputDisplay: PER_RULE_RUN,
      },
    ],
    [PER_RULE_RUN]
  );

  return (
    <>
      <WorkflowSelectorWithProvider
        selectedWorkflowId={workflowId}
        onWorkflowChange={handleWorkflowChange}
        config={{
          sortFunction: (workflows) =>
            workflows.sort((a, b) => {
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
        label={i18n.translate('xpack.stackConnectors.components.workflows.executionMode.label', {
          defaultMessage: 'Action frequency',
        })}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiSuperSelect
              fullWidth
              prepend={summaryOrPerRuleSelect}
              data-test-subj="workflow-per-rule-run-select"
              options={perRuleRunOptions}
              valueOfSelected="perRuleRun"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default WorkflowsParamsFields;
