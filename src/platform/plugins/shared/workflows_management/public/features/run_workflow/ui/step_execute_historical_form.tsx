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
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { CodeEditor, monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { z } from '@kbn/zod/v4';
import { InputValidationCallout } from './input_validation_callout';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';
import { useWorkflowStepExecutions } from '../../../entities/workflows/model/use_workflow_step_executions';
import { selectWorkflowId } from '../../../entities/workflows/store';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { buildContextOverrideFromExecution } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import { WORKFLOWS_MONACO_EDITOR_THEME } from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';
import { useStepExecution } from '../../workflow_execution_detail/model/use_step_execution';

export const NOT_READY_SENTINEL = '__step_historical_not_ready__';
const SCHEMA_URI = `inmemory://schemas/test-step-json-historical-editor-schema`;

export interface StepExecuteHistoricalFormProps {
  value: string;
  setValue: (value: string) => void;
  warnings: string | null;
  errors: string | null;
  setErrors: (errors: string | null) => void;
  /** When provided (e.g. from replay), pre-select this step execution in the combo */
  initialStepExecutionId?: string | null;
  /** When provided with initialStepExecutionId, used to fetch step execution before combo options load */
  initialWorkflowRunId?: string | null;
  /** Step id when not from editor focus (e.g. from replay); used for useWorkflowStepExecutions and labels */
  stepId: string;
  /** JSON Schema for the step inputs */
  contextJsonSchema?: z.core.JSONSchema.BaseSchema;
  /** Workflow graph for the step (subgraph) used to reconstruct context override from execution data */
  workflowGraph?: WorkflowGraph;
}

export const StepExecuteHistoricalForm = React.memo<StepExecuteHistoricalFormProps>(
  ({
    value,
    setValue,
    errors,
    setErrors,
    warnings,
    initialStepExecutionId,
    initialWorkflowRunId,
    stepId,
    contextJsonSchema,
    workflowGraph,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [selectedStepExecutionId, setSelectedStepExecutionId] = useState<string | null>(
      initialStepExecutionId ?? null
    );
    const getFormattedDateTime = useGetFormattedDateTime();

    const workflowId = useSelector(selectWorkflowId);

    const { data: stepExecutionsList } = useWorkflowStepExecutions({
      workflowId: workflowId ?? null,
      stepId,
      size: 100,
    });

    const selectedItem = useMemo(() => {
      const results = stepExecutionsList?.results ?? [];
      return results.find((r) => r.id === selectedStepExecutionId) ?? null;
    }, [stepExecutionsList?.results, selectedStepExecutionId]);

    const workflowRunIdForFetch = selectedItem?.workflowRunId ?? initialWorkflowRunId ?? '';
    const { data: selectedStepExecution, isLoading: isLoadingStepExecution } = useStepExecution(
      workflowRunIdForFetch,
      selectedStepExecutionId ?? undefined,
      selectedItem?.status
    );

    const { data: workflowExecution, isLoading: isLoadingWorkflowExecution } = useWorkflowExecution(
      {
        executionId: workflowRunIdForFetch || null,
        enabled: !!selectedStepExecutionId && !!workflowRunIdForFetch,
        includeInput: true,
        includeOutput: true,
      }
    );

    const executionOptions: EuiComboBoxOptionOption<string>[] = useMemo(() => {
      const results = stepExecutionsList?.results ?? [];
      if (!results.length) return [];
      // Count the number of step executions for each workflow run to identify loop executions
      const workflowRunIdsStepCount = results.reduce((acc, stepExecution) => {
        acc[stepExecution.workflowRunId] = (acc[stepExecution.workflowRunId] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const loopStepRunIdsIndex = new Map<string, number>(
        Object.entries(workflowRunIdsStepCount)
          .filter(([_, count]) => count > 1) // only steps executed multiple times (count > 1)
          .map(([workflowRunId, count]) => [workflowRunId, count - 1]) // start at 0 for the first loop iteration
      );

      return results.map((stepExecution): EuiComboBoxOptionOption<string> => {
        const { id, stepType, workflowRunId, startedAt, status, isTestRun, executionTimeMs } =
          stepExecution;
        const stepDuration = formatDuration(executionTimeMs ?? 0);
        const formattedDateTime = getFormattedDateTime(new Date(startedAt)) ?? startedAt;
        const timeAgo = moment(startedAt).fromNow();
        const statusIcon = getExecutionStatusIcon(euiTheme, status);

        const append: React.ReactNode[] = [];
        if (loopStepRunIdsIndex.has(workflowRunId)) {
          const loopIndex = loopStepRunIdsIndex.get(workflowRunId) ?? 0;
          loopStepRunIdsIndex.set(workflowRunId, loopIndex - 1); // decrement the index for the next loop iteration (time descending order)
          append.push(
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="refresh"
                aria-hidden={true}
                content={translations.loopExecution(loopIndex)}
              />
            </EuiFlexItem>
          );
        }
        if (isTestRun) {
          append.push(
            <EuiFlexItem grow={false}>
              <EuiIconTip type="flask" aria-hidden={true} content={translations.testRun} />
            </EuiFlexItem>
          );
        }
        return {
          key: id,
          value: id,
          label: translations.getRunLabel(stepType ?? '', formattedDateTime, timeAgo, stepDuration),
          prepend: <EuiFlexItem grow={false}>{statusIcon}</EuiFlexItem>,
          ...(append.length > 0 && {
            append: (
              <EuiFlexGroup direction="row" gutterSize="xs">
                {append}
              </EuiFlexGroup>
            ),
          }),
          css: css`
            .euiComboBoxOption__append {
              margin-top: 3px;
            }
          `,
        };
      });
    }, [stepExecutionsList?.results, getFormattedDateTime, euiTheme]);

    useEffect(() => {
      if (initialStepExecutionId != null) {
        setSelectedStepExecutionId(initialStepExecutionId);
      }
    }, [initialStepExecutionId]);

    useEffect(() => {
      if (!selectedStepExecutionId || isLoadingStepExecution || isLoadingWorkflowExecution) {
        setErrors(NOT_READY_SENTINEL);
      }
    }, [selectedStepExecutionId, isLoadingStepExecution, isLoadingWorkflowExecution, setErrors]);

    useEffect(() => {
      if (selectedStepExecution && workflowExecution && workflowGraph) {
        const override = buildContextOverrideFromExecution(
          workflowGraph,
          workflowExecution,
          selectedStepExecution
        );
        setValue(JSON.stringify(override.stepContext, null, 2));
        setErrors(null);
      }
    }, [selectedStepExecution, workflowExecution, workflowGraph, setValue, setErrors]);

    const handleExecutionChange = useCallback((selected: EuiComboBoxOptionOption<string>[]) => {
      const id = selected.length > 0 && selected[0].value ? String(selected[0].value) : null;
      setSelectedStepExecutionId(id);
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

    // Hook Monaco on mount to register the schema for validation + suggestions
    const handleMount = useCallback(
      (editor: monaco.editor.IStandaloneCodeEditor) => {
        if (!contextJsonSchema) return;

        try {
          // First, configure the JSON language service with schema validation
          const currentModel = editor.getModel();
          monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: false,
            enableSchemaRequest: false,
            schemas: [
              {
                uri: SCHEMA_URI, // schema URI
                fileMatch: [currentModel?.uri.toString() ?? ''], // bind to this specific model URI
                schema: contextJsonSchema,
              },
            ],
          });
        } catch (error) {
          // Monaco setup failed - fall back to basic JSON editing
        }
      },
      [contextJsonSchema]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFormRow label={translations.selectStepExecutionLabel} fullWidth>
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              options={executionOptions}
              selectedOptions={
                selectedStepExecutionId && executionOptions.length > 0
                  ? executionOptions.filter((o) => o.key === selectedStepExecutionId)
                  : []
              }
              onChange={handleExecutionChange}
              isClearable
              fullWidth
              isLoading={stepExecutionsList === undefined && !!workflowId}
              placeholder={translations.selectStepExecutionPlaceholder}
              data-test-subj="workflowTestStepModalReplayExecutionComboBox"
            />
          </EuiFormRow>
        </EuiFlexItem>

        {selectedStepExecution && (
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              {((errors && errors !== NOT_READY_SENTINEL) || warnings) && (
                <EuiFlexItem grow={false}>
                  <InputValidationCallout errors={errors} warnings={warnings} />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiFormRow label={translations.contextOverrideLabel} fullWidth>
                  <CodeEditor
                    languageId="json"
                    value={value}
                    fitToContent={{
                      minLines: 5,
                      maxLines: 15,
                    }}
                    width="100%"
                    onChange={handleChange}
                    editorDidMount={handleMount}
                    dataTestSubj="workflow-test-step-historical-json-editor"
                    overflowWidgetsContainerZIndexOverride={6001}
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
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        {selectedStepExecutionId && (isLoadingStepExecution || isLoadingWorkflowExecution) && (
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
StepExecuteHistoricalForm.displayName = 'StepExecuteHistoricalForm';

const translations = {
  getRunLabel: (stepType: string, dateTime: string, timeAgo: string, stepDuration: string) =>
    i18n.translate('workflows.testStepModal.replayOptionLabel', {
      defaultMessage: 'Step type: "{stepType}" - {dateTime} ({timeAgo}) - took {stepDuration}',
      values: { stepType, stepDuration, dateTime, timeAgo },
    }),
  loopExecution: (loopIndex: number) =>
    i18n.translate('workflows.testStepModal.loopExecution', {
      defaultMessage: 'Loop index: {loopIndex}',
      values: { loopIndex },
    }),
  testRun: i18n.translate('workflows.testStepModal.testRun', {
    defaultMessage: 'Test Run',
  }),
  invalidJson: i18n.translate('workflows.testStepModal.invalidJson', {
    defaultMessage: 'Invalid JSON',
  }),
  selectStepExecutionLabel: i18n.translate('workflows.testStepModal.selectStepExecutionLabel', {
    defaultMessage: 'Select step execution',
  }),
  selectStepExecutionPlaceholder: i18n.translate(
    'workflows.testStepModal.selectStepExecutionPlaceholder',
    { defaultMessage: 'Search or select a previous step run' }
  ),
  stepInputLabel: i18n.translate('workflows.testStepModal.stepInputLabel', {
    defaultMessage: 'Step input',
  }),
  contextOverrideLabel: i18n.translate('workflows.testStepModal.contextOverrideLabel', {
    defaultMessage: 'Context override',
  }),
  loadingExecution: i18n.translate('workflows.testStepModal.loadingExecution', {
    defaultMessage: 'Loading step execution…',
  }),
};
