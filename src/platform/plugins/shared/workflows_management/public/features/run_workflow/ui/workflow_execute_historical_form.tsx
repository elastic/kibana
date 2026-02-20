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
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { TRIGGER_TABS_LABELS } from './translations';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { useWorkflowExecutions } from '../../../entities/workflows/model/use_workflow_executions';
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
        return {
          key: execution.id,
          value: execution.id,
          label: i18n.translate('workflows.workflowExecuteModal.replayOptionLabel', {
            defaultMessage: 'Run #{runNumber} - {dateTime}',
            values: {
              runNumber,
              dateTime: getFormattedDateTime(new Date(execution.startedAt)) ?? execution.startedAt,
            },
          }),
          prepend: (
            <EuiIconTip
              type={execution.isTestRun ? 'flask' : 'empty'}
              aria-hidden={true}
              content={
                execution.isTestRun
                  ? i18n.translate('workflows.workflowExecuteModal.testRun', {
                      defaultMessage: 'Test run',
                    })
                  : undefined
              }
            />
          ),
          css: css`
            .euiComboBoxOption__prepend {
              margin-top: 3px; /* align the icon with the text */
            }
          `,
        };
      });
    }, [executionsList, getFormattedDateTime]);

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
          setErrors(
            i18n.translate('workflows.workflowExecuteModal.invalidJson', {
              defaultMessage: 'Invalid JSON',
            })
          );
        }
      },
      [setValue, setErrors]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiSpacer size="s" />
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('workflows.workflowExecuteModal.replaySelectLabel', {
              defaultMessage: 'Select execution',
            })}
            fullWidth
          >
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
              placeholder={i18n.translate(
                'workflows.workflowExecuteModal.replaySelectPlaceholder',
                { defaultMessage: 'Search or select a previous run' }
              )}
              data-test-subj="workflowExecuteModalReplayExecutionComboBox"
              css={css`
                .euiComboBoxPlainTextSelection__prepend {
                  margin-inline-end: 0px;
                  margin-top: 3px; /* align the icon with the text */
                }
              `}
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
                  title={i18n.translate('workflows.workflowExecuteModal.replayInvalidJsonTitle', {
                    defaultMessage: 'Invalid JSON',
                  })}
                >
                  <p>{errors}</p>
                </EuiCallOut>
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('workflows.workflowExecuteModal.replayInputDataLabel', {
                  defaultMessage: 'Input data (original: {originalTrigger})',
                  values: { originalTrigger: getTriggerTypeLabel(selectedExecution.context) },
                })}
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
              <FormattedMessage
                id="workflows.workflowExecuteModal.loadingExecution"
                defaultMessage="Loading execution…"
              />
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
