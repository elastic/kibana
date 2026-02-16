/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiCallOut, EuiComboBox, EuiFlexItem, EuiFormRow, EuiText } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { TRIGGER_TABS_LABELS } from './translations';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { useWorkflowExecutions } from '../../../entities/workflows/model/use_workflow_executions';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { WORKFLOWS_MONACO_EDITOR_THEME } from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';

export interface WorkflowExecuteReplayProps {
  workflowId: string | undefined;
  selectedExecutionId: string | null;
  onSelectionChange: (executionId: string | null) => void;
  editorValue: string;
  onEditorChange: (value: string) => void;
  editorErrors: string | null;
  onEditorErrorsChange: (errors: string | null) => void;
}

export const WorkflowExecuteReplay = React.memo<WorkflowExecuteReplayProps>(
  ({
    workflowId,
    selectedExecutionId,
    onSelectionChange,
    editorValue,
    onEditorChange,
    editorErrors,
    onEditorErrorsChange,
  }) => {
    const getFormattedDateTime = useGetFormattedDateTime();

    const { data: executionsList } = useWorkflowExecutions({
      workflowId: workflowId ?? null,
      size: 100,
    });

    const executionOptions: EuiComboBoxOptionOption<string>[] = useMemo(() => {
      const total = executionsList?.total ?? 0;
      const results = executionsList?.results ?? [];
      if (!results.length) return [];
      return results.map((execution, index) => {
        const runNumber = total - index;
        return {
          label: i18n.translate('workflows.workflowExecuteModal.replayOptionLabel', {
            defaultMessage: 'Run #{runNumber} - {dateTime}',
            values: {
              runNumber,
              dateTime: getFormattedDateTime(new Date(execution.startedAt)) ?? execution.startedAt,
            },
          }),
          key: execution.id,
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

    useEffect(() => {
      if (selectedExecution) {
        onEditorChange(JSON.stringify(replayInputsFromContext, null, 2));
        onEditorErrorsChange(null);
      }
    }, [selectedExecution, replayInputsFromContext, onEditorChange, onEditorErrorsChange]);

    const handleReplayOptionChange = useCallback(
      (selected: EuiComboBoxOptionOption<string>[]) => {
        const id = selected.length > 0 && selected[0].key ? String(selected[0].key) : null;
        onSelectionChange(id);
      },
      [onSelectionChange]
    );

    return (
      <>
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
              onChange={handleReplayOptionChange}
              isClearable
              fullWidth
              isLoading={!executionsList && !!workflowId}
              placeholder={i18n.translate(
                'workflows.workflowExecuteModal.replaySelectPlaceholder',
                { defaultMessage: 'Search or select a previous run' }
              )}
              data-test-subj="workflowExecuteModalReplayExecutionComboBox"
            />
          </EuiFormRow>
        </EuiFlexItem>

        {selectedExecution && (
          <>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate('workflows.workflowExecuteModal.originalTriggerLabel', {
                  defaultMessage: 'Original input: {trigger}',
                  values: { trigger: getTriggerTypeLabel(selectedExecution.context) },
                })}
              </EuiText>
            </EuiFlexItem>
            {editorErrors && (
              <EuiFlexItem grow={false}>
                <EuiCallOut
                  announceOnMount
                  color="danger"
                  size="s"
                  title={i18n.translate('workflows.workflowExecuteModal.replayInvalidJsonTitle', {
                    defaultMessage: 'Invalid JSON',
                  })}
                >
                  <p>{editorErrors}</p>
                </EuiCallOut>
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('workflows.workflowExecuteModal.replayInputDataLabel', {
                  defaultMessage: 'Input data (editable)',
                })}
                fullWidth
              >
                <CodeEditor
                  languageId="json"
                  value={editorValue}
                  fitToContent={{ minLines: 5, maxLines: 20 }}
                  width="100%"
                  onChange={(value) => {
                    onEditorChange(value);
                    try {
                      JSON.parse(value);
                      onEditorErrorsChange(null);
                    } catch {
                      onEditorErrorsChange(
                        i18n.translate('workflows.workflowExecuteModal.invalidJson', {
                          defaultMessage: 'Invalid JSON',
                        })
                      );
                    }
                  }}
                  dataTestSubj="workflowExecuteModalReplayJsonEditor"
                  options={{
                    language: 'json',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    lineNumbers: 'on',
                    theme: WORKFLOWS_MONACO_EDITOR_THEME,
                    formatOnType: true,
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
      </>
    );
  }
);
WorkflowExecuteReplay.displayName = 'WorkflowExecuteReplay';

function getTriggerTypeLabel(context?: Record<string, unknown>): string {
  if (!context) return '';
  const event = context?.event as Record<string, unknown>;
  if (event?.alerts) return TRIGGER_TABS_LABELS.alert;
  if (event?.documents) return TRIGGER_TABS_LABELS.index;
  return TRIGGER_TABS_LABELS.manual;
}
