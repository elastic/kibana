/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { TRIGGER_TABS_LABELS } from './translations';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { useWorkflowExecutions } from '../../../entities/workflows/model/use_workflow_executions';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { WORKFLOWS_MONACO_EDITOR_THEME } from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';

/**
 * Sentinel error value used to signal "not ready" to the parent (no execution
 * selected, or execution still loading). The parent disables submit whenever
 * `errors` is non-null, so this keeps the Run button disabled without
 * displaying a visible error message.
 */
export const NOT_READY_SENTINEL = '__historical_not_ready__';

export interface WorkflowExecuteHistoricalFormProps {
  workflowId: string | undefined;
  /** Pre-select this execution when the form mounts (e.g. from Replay button). */
  initialExecutionId?: string;
  value: string;
  setValue: (value: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
}

export const WorkflowExecuteHistoricalForm = React.memo<WorkflowExecuteHistoricalFormProps>(
  ({ workflowId, initialExecutionId, value, setValue, errors, setErrors }) => {
    const { euiTheme } = useEuiTheme();
    const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(
      initialExecutionId ?? null
    );
    const getFormattedDateTime = useGetFormattedDateTime();

    const { data: executionsList } = useWorkflowExecutions({
      workflowId: workflowId ?? null,
      size: 100,
    });

    const executionOptions: EuiComboBoxOptionOption<string>[] = useMemo(() => {
      const total = executionsList?.total ?? 0;
      const results = executionsList?.results ?? [];
      if (!results.length) return [];
      return results.map((execution, index): EuiComboBoxOptionOption<string> => {
        const runNumber = total - index;
        const formattedDateTime =
          getFormattedDateTime(new Date(execution.startedAt)) ?? execution.startedAt;
        const statusIcon = getExecutionStatusIcon(euiTheme, execution.status);
        return {
          key: execution.id,
          value: execution.id,
          label: translations.getRunLabel(runNumber, formattedDateTime),
          prepend: <EuiFlexItem grow={false}>{statusIcon}</EuiFlexItem>,
          ...(execution.isTestRun && {
            append: <EuiIconTip type="flask" aria-hidden={true} content={translations.testRun} />,
          }),
          css: css`
            .euiComboBoxOption__append {
              margin-top: 3px; /* align the icon with the text */
            }
          `,
        };
      });
    }, [euiTheme, executionsList?.results, executionsList?.total, getFormattedDateTime]);

    const { data: selectedExecution, isLoading: isLoadingExecution } = useWorkflowExecution({
      executionId: selectedExecutionId,
      enabled: selectedExecutionId !== null,
    });

    const replayInputsFromContext = useMemo((): Record<string, unknown> => {
      if (!selectedExecution?.context) return {};
      const ctx = selectedExecution.context as Record<string, unknown>;
      return {
        ...(typeof ctx.inputs === 'object' && ctx.inputs !== null ? (ctx.inputs as object) : {}),
        ...(ctx.event !== undefined ? { event: ctx.event } : {}),
      };
    }, [selectedExecution?.context]);

    // Signal "not ready" to the parent when no execution is selected or still loading
    useEffect(() => {
      if (!selectedExecutionId || isLoadingExecution) {
        setErrors(NOT_READY_SENTINEL);
      }
    }, [selectedExecutionId, isLoadingExecution, setErrors]);

    // Populate the editor when execution data arrives
    useEffect(() => {
      if (selectedExecution) {
        setValue(JSON.stringify(replayInputsFromContext, null, 2));
        setErrors(null);
      }
    }, [selectedExecution, replayInputsFromContext, setValue, setErrors]);

    const handleExecutionChange = useCallback((selected: EuiComboBoxOptionOption<string>[]) => {
      const id = selected.length > 0 && selected[0].value ? String(selected[0].value) : null;
      setSelectedExecutionId(id);
    }, []);

    const handleChange = useCallback(
      (newValue: string) => {
        setValue(newValue);
        try {
          JSON.parse(newValue);
          setErrors(null);
        } catch {
          setErrors(translations.invalidJson);
        }
      },
      [setValue, setErrors]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiSpacer size="s" />
        <EuiFlexItem grow={false}>
          <EuiFormRow label={translations.selectExecutionLabel} fullWidth>
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              options={executionOptions}
              selectedOptions={
                selectedExecutionId && executionOptions.length > 0
                  ? executionOptions.filter((o) => o.key === selectedExecutionId)
                  : []
              }
              onChange={handleExecutionChange}
              isClearable
              fullWidth
              isLoading={!executionsList && !!workflowId}
              placeholder={translations.selectExecutionPlaceholder}
              data-test-subj="workflowExecuteModalReplayExecutionComboBox"
            />
          </EuiFormRow>
        </EuiFlexItem>

        {selectedExecution && (
          <>
            {errors && errors !== NOT_READY_SENTINEL && (
              <EuiFlexItem grow={false}>
                <EuiCallOut
                  announceOnMount
                  color="danger"
                  size="s"
                  title={translations.invalidJson}
                >
                  <p>{errors}</p>
                </EuiCallOut>
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiFormRow
                label={translations.getInputDataLabel(
                  getTriggerTypeLabel(selectedExecution.context)
                )}
                fullWidth
              >
                <CodeEditor
                  languageId="json"
                  value={value}
                  fitToContent={{
                    minLines: 5,
                    maxLines: 15,
                  }}
                  width="100%"
                  onChange={handleChange}
                  dataTestSubj={'workflow-historical-json-editor'}
                  options={{
                    language: 'json',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    lineNumbers: 'on',
                    glyphMargin: true,
                    tabSize: 2,
                    lineNumbersMinChars: 2,
                    insertSpaces: true,
                    fontSize: 14,
                    renderWhitespace: 'all',
                    wordWrapColumn: 80,
                    wrappingIndent: 'indent',
                    theme: WORKFLOWS_MONACO_EDITOR_THEME,
                    formatOnType: true,
                    quickSuggestions: false,
                    suggestOnTriggerCharacters: false,
                    wordBasedSuggestions: false,
                    parameterHints: {
                      enabled: false,
                    },
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </>
        )}
        {selectedExecutionId && isLoadingExecution && (
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {translations.loadingExecution}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
WorkflowExecuteHistoricalForm.displayName = 'WorkflowExecuteHistoricalForm';

function getTriggerTypeLabel(context?: Record<string, unknown>): string {
  if (!context) return '';
  const event = context?.event as Record<string, unknown>;
  if (event?.alerts) return TRIGGER_TABS_LABELS.alert;
  if (event?.documents) return TRIGGER_TABS_LABELS.index;
  return TRIGGER_TABS_LABELS.manual;
}

const translations = {
  getRunLabel: (runNumber: number, dateTime: string) =>
    i18n.translate('workflows.workflowExecuteModal.replayOptionLabel', {
      defaultMessage: 'Run #{runNumber} - {dateTime}',
      values: { runNumber, dateTime },
    }),
  testRun: i18n.translate('workflows.workflowExecuteModal.testRun', {
    defaultMessage: 'Test run',
  }),
  invalidJson: i18n.translate('workflows.workflowExecuteModal.invalidJson', {
    defaultMessage: 'Invalid JSON',
  }),
  selectExecutionLabel: i18n.translate('workflows.workflowExecuteModal.selectExecutionLabel', {
    defaultMessage: 'Select execution',
  }),
  selectExecutionPlaceholder: i18n.translate(
    'workflows.workflowExecuteModal.selectExecutionPlaceholder',
    { defaultMessage: 'Search or select a previous run' }
  ),
  getInputDataLabel: (originalTrigger: string) =>
    i18n.translate('workflows.workflowExecuteModal.inputDataLabel', {
      defaultMessage: 'Input data (original: {originalTrigger})',
      values: { originalTrigger },
    }),
  loadingExecution: i18n.translate('workflows.workflowExecuteModal.loadingExecution', {
    defaultMessage: 'Loading execution…',
  }),
};
