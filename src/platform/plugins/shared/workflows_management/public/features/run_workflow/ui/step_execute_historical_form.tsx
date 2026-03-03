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
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CodeEditor, monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import type { z } from '@kbn/zod/v4';
import { useWorkflowStepExecutions } from '../../../entities/workflows/model/use_workflow_step_executions';
import { selectWorkflowId } from '../../../entities/workflows/store';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { WORKFLOWS_MONACO_EDITOR_THEME } from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';
import { useStepExecution } from '../../workflow_execution_detail/model/use_step_execution';

export const NOT_READY_SENTINEL = '__step_historical_not_ready__';
const SCHEMA_URI = `inmemory://schemas/test-step-json-historical-editor-schema`;

export interface StepExecuteHistoricalFormProps {
  value: string;
  setValue: (value: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
  /** When provided (e.g. from replay), pre-select this step execution in the combo */
  initialStepExecutionId?: string | null;
  /** When provided with initialStepExecutionId, used to fetch step execution before combo options load */
  initialWorkflowRunId?: string | null;
  /** Step id when not from editor focus (e.g. from replay); used for useWorkflowStepExecutions and labels */
  stepId: string;
  /** JSON Schema for the step inputs */
  inputsJsonSchema?: z.core.JSONSchema.BaseSchema;
}

export const StepExecuteHistoricalForm = React.memo<StepExecuteHistoricalFormProps>(
  ({
    value,
    setValue,
    errors,
    setErrors,
    initialStepExecutionId,
    initialWorkflowRunId,
    stepId,
    inputsJsonSchema,
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

    const executionOptions: EuiComboBoxOptionOption<string>[] = useMemo(() => {
      const total = stepExecutionsList?.total ?? 0;
      const results = stepExecutionsList?.results ?? [];
      if (!results.length) return [];
      // Count the number of step executions for each workflow run to identify loop executions
      const workflowRunIdsStepCount = results.reduce((acc, stepExecution) => {
        acc[stepExecution.workflowRunId] = (acc[stepExecution.workflowRunId] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return results.map((stepExecution, index): EuiComboBoxOptionOption<string> => {
        const runNumber = total - index;
        const formattedDateTime =
          getFormattedDateTime(new Date(stepExecution.startedAt)) ?? stepExecution.startedAt;
        const statusIcon = getExecutionStatusIcon(euiTheme, stepExecution.status);
        const isLoopExecution = workflowRunIdsStepCount[stepExecution.workflowRunId] > 1;
        return {
          key: stepExecution.id,
          value: stepExecution.id,
          label: translations.getRunLabel(stepId ?? '', runNumber, formattedDateTime),
          prepend: <EuiFlexItem grow={false}>{statusIcon}</EuiFlexItem>,
          ...(isLoopExecution && {
            append: (
              <EuiIconTip type="refresh" aria-hidden={true} content={translations.loopExecution} />
            ),
          }),
          css: css`
            .euiComboBoxOption__append {
              margin-top: 3px;
            }
          `,
        };
      });
    }, [
      stepExecutionsList?.total,
      stepExecutionsList?.results,
      getFormattedDateTime,
      euiTheme,
      stepId,
    ]);

    useEffect(() => {
      if (initialStepExecutionId != null) {
        setSelectedStepExecutionId(initialStepExecutionId);
      }
    }, [initialStepExecutionId]);

    useEffect(() => {
      if (!selectedStepExecutionId || isLoadingStepExecution) {
        setErrors(NOT_READY_SENTINEL);
      }
    }, [selectedStepExecutionId, isLoadingStepExecution, setErrors]);

    useEffect(() => {
      if (selectedStepExecution?.input !== undefined) {
        const input =
          typeof selectedStepExecution.input === 'object' && selectedStepExecution.input !== null
            ? selectedStepExecution.input
            : { value: selectedStepExecution.input };
        setValue(JSON.stringify(input, null, 2));
        setErrors(null);
      }
    }, [selectedStepExecution, setValue, setErrors]);

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
    const mountedOnce = useRef(false);
    const handleMount = useCallback(
      (editor: monaco.editor.IStandaloneCodeEditor) => {
        if (!inputsJsonSchema || mountedOnce.current) return;
        mountedOnce.current = true;

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
                schema: inputsJsonSchema,
              },
            ],
          });
        } catch (error) {
          // Monaco setup failed - fall back to basic JSON editing
        }
      },
      [inputsJsonSchema]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="l">
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
              <EuiFormRow label={translations.stepInputLabel} fullWidth>
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
        {selectedStepExecutionId && isLoadingStepExecution && (
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
  getRunLabel: (stepId: string, runNumber: number, dateTime: string) =>
    i18n.translate('workflows.testStepModal.replayOptionLabel', {
      defaultMessage: 'Run #{runNumber} (Step: "{stepId}") - {dateTime}',
      values: { stepId, runNumber, dateTime },
    }),
  loopExecution: i18n.translate('workflows.testStepModal.loopExecution', {
    defaultMessage: 'Multiple step executions found in the same workflow run (loop/retry)',
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
  loadingExecution: i18n.translate('workflows.testStepModal.loadingExecution', {
    defaultMessage: 'Loading step execution…',
  }),
};
