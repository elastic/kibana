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
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRadio,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css, Global } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { parseDocument } from 'yaml';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowYaml } from '@kbn/workflows';
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import { ENABLED_TRIGGER_TABS } from './constants';
import { TRIGGER_TABS_DESCRIPTIONS, TRIGGER_TABS_LABELS } from './translations';
import type { WorkflowTriggerTab } from './types';
import { useExecutionInput } from './use_execution_input/use_execution_input';
import { WorkflowExecuteEventForm } from './workflow_execute_event_form';
import { WorkflowExecuteIndexForm } from './workflow_execute_index_form';
import { WorkflowExecuteManualForm } from './workflow_execute_manual_form';
import { WorkflowExecuteReplay } from './workflow_execute_replay';
import { useWorkflowExecution } from '../../../entities/workflows/model/use_workflow_execution';

function getDefaultTrigger(definition: WorkflowYaml | null): WorkflowTriggerTab {
  if (!definition) {
    return 'alert';
  }

  const hasManualTrigger = definition.triggers?.some((trigger) => trigger.type === 'manual');
  // Check if inputs exist and have properties (handles both new and legacy formats)
  const normalizedInputs = normalizeInputsToJsonSchema(definition.inputs);
  const hasInputs =
    normalizedInputs?.properties && Object.keys(normalizedInputs.properties).length > 0;

  if (hasManualTrigger && hasInputs) {
    return 'manual';
  }
  return 'alert';
}

export type InputMode = 'new_run' | 'replay';

export interface WorkflowExecuteModalProps {
  definition: WorkflowYaml | null;
  workflowId?: string;
  isTestRun: boolean;
  onClose: () => void;
  onSubmit: (
    data: Record<string, unknown>,
    triggerTab: WorkflowTriggerTab | undefined,
    isReplay: boolean
  ) => void;
  yamlString?: string;
  /** When set, open in replay mode with this execution pre-selected */
  initialExecutionId?: string;
  /** Initial input mode; defaults to new_run if no initialExecutionId */
  initialInputMode?: InputMode;
}
export const WorkflowExecuteModal = React.memo<WorkflowExecuteModalProps>(
  ({
    definition,
    workflowId,
    onClose,
    onSubmit,
    isTestRun,
    yamlString,
    initialExecutionId,
    initialInputMode,
  }) => {
    const modalTitleId = useGeneratedHtmlId();
    const inputModeButtonId = useGeneratedHtmlId();
    const defaultTrigger = useMemo(() => getDefaultTrigger(definition), [definition]);
    const [selectedTrigger, setSelectedTrigger] = useState<WorkflowTriggerTab>(defaultTrigger);

    const defaultInputMode: InputMode =
      initialInputMode ?? (initialExecutionId ? 'replay' : 'new_run');
    const [inputMode, setInputMode] = useState<InputMode>(defaultInputMode);
    const [selectedReplayExecutionId, setSelectedReplayExecutionId] = useState<string | null>(
      initialExecutionId ?? null
    );
    const [replayEditorValue, setReplayEditorValue] = useState<string>('{}');
    const [replayEditorErrors, setReplayEditorErrors] = useState<string | null>(null);

    const { executionInput, setExecutionInput } = useExecutionInput({
      workflowName: definition?.name || '',
      workflowId,
      selectedTrigger,
    });
    const [executionInputErrors, setExecutionInputErrors] = useState<string | null>(null);

    const { euiTheme } = useEuiTheme();

    const { isLoading: isLoadingReplayExecution } = useWorkflowExecution({
      executionId: inputMode === 'replay' ? selectedReplayExecutionId : null,
      enabled: inputMode === 'replay' && selectedReplayExecutionId !== null,
    });

    const handleSubmit = useCallback(() => {
      if (inputMode === 'replay') {
        try {
          const parsed = JSON.parse(replayEditorValue) as Record<string, unknown>;
          onSubmit(parsed, undefined, true);
          onClose();
        } catch (e) {
          setReplayEditorErrors(
            e instanceof Error
              ? e.message
              : i18n.translate('workflows.workflowExecuteModal.invalidJson', {
                  defaultMessage: 'Invalid JSON',
                })
          );
        }
        return;
      }
      onSubmit(JSON.parse(executionInput), selectedTrigger, false);
      onClose();
    }, [inputMode, onSubmit, onClose, executionInput, selectedTrigger, replayEditorValue]);

    const handleChangeTrigger = useCallback(
      (trigger: WorkflowTriggerTab): void => {
        setExecutionInput('');
        setSelectedTrigger(trigger);
      },
      [setExecutionInput, setSelectedTrigger]
    );

    const isReplaySubmitDisabled =
      inputMode === 'replay' &&
      (selectedReplayExecutionId === null ||
        isLoadingReplayExecution ||
        Boolean(replayEditorErrors));

    // Extract inputs from yamlString if definition.inputs is undefined
    const inputs = useMemo(() => {
      if (definition?.inputs) {
        return definition.inputs;
      }
      if (yamlString) {
        try {
          const yamlDoc = parseDocument(yamlString);
          const yamlJson = yamlDoc.toJSON();
          if (yamlJson && typeof yamlJson === 'object' && 'inputs' in yamlJson) {
            return (yamlJson as Record<string, unknown>).inputs;
          }
        } catch (e) {
          // Ignore errors when extracting from YAML
        }
      }
      return undefined;
    }, [definition?.inputs, yamlString]);

    const shouldAutoRun = useMemo(() => {
      if (!definition) {
        return false;
      }
      const hasAlertTrigger = definition.triggers?.some((trigger) => trigger.type === 'alert');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalizedInputs = normalizeInputsToJsonSchema(inputs as any);
      const hasInputs =
        normalizedInputs?.properties && Object.keys(normalizedInputs.properties).length > 0;
      if (!hasAlertTrigger && !hasInputs) {
        return true;
      }
      return false;
    }, [definition, inputs]);

    useEffect(() => {
      if (shouldAutoRun) {
        onSubmit({}, 'manual', false);
        onClose();
        return;
      }
      // Default trigger selection
      if (definition?.triggers?.some((trigger) => trigger.type === 'alert')) {
        setSelectedTrigger('alert');
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalizedInputs = normalizeInputsToJsonSchema(inputs as any);
      const hasInputs =
        normalizedInputs?.properties && Object.keys(normalizedInputs.properties).length > 0;
      if (hasInputs) {
        setSelectedTrigger('manual');
      }
    }, [shouldAutoRun, onSubmit, onClose, definition, inputs]);

    if (shouldAutoRun) {
      // Not rendered if the workflow should auto run, will close the modal automatically
      return null;
    }

    const modalTitle = isTestRun
      ? {
          id: 'workflows.workflowExecuteModal.testTitle',
          defaultMessage: 'Test Workflow',
        }
      : {
          id: 'workflows.workflowExecuteModal.runTitle',
          defaultMessage: 'Run Workflow',
        };

    return (
      <>
        {/*
        The following Global CSS is needed to ensure that modal will not overlay SearchBar's
        autocomplete popup. The autocomplete popup has z-index 4001, so we need to ensure
        the modal and its overlay don't block it.
      */}
        <Global
          styles={css`
            .euiOverlayMask:has(.workflowExecuteModal) {
              z-index: 4000;
            }
            /* Ensure query input container allows autocomplete to overflow */
            .workflowExecuteModal [data-test-subj='workflow-query-input'] {
              position: relative;
              z-index: 1;
            }
            /* Allow autocomplete popup to render above modal */
            .workflowExecuteModal .kbnQueryBar__textareaWrapOuter {
              overflow: visible;
            }
            .workflowExecuteModal .kbnTypeahead,
            .workflowExecuteModal .kbnTypeahead__popover {
              z-index: 4002 !important;
            }
          `}
        />
        <EuiModal
          className="workflowExecuteModal"
          aria-labelledby={modalTitleId}
          onClose={onClose}
          maxWidth={1400}
          style={{ width: '1200px', height: '100vh' }}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              {i18n.translate(modalTitle.id, { defaultMessage: modalTitle.defaultMessage })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate('workflows.workflowExecuteModal.inputModeLabel', {
                    defaultMessage: 'Input',
                  })}
                >
                  <EuiButtonGroup
                    id={inputModeButtonId}
                    legend={i18n.translate('workflows.workflowExecuteModal.inputModeLegend', {
                      defaultMessage: 'Choose input mode',
                    })}
                    options={[
                      {
                        id: 'new_run',
                        label: i18n.translate('workflows.workflowExecuteModal.inputModeNewRun', {
                          defaultMessage: 'New input',
                        }),
                      },
                      {
                        id: 'replay',
                        label: i18n.translate(
                          'workflows.workflowExecuteModal.inputModeFromHistorical',
                          {
                            defaultMessage: 'From historical',
                          }
                        ),
                      },
                    ]}
                    idSelected={inputMode}
                    onChange={(id) => setInputMode(id as InputMode)}
                    color="primary"
                    data-test-subj="workflowExecuteModalInputModeButtonGroup"
                  />
                </EuiFormRow>
              </EuiFlexItem>

              {inputMode === 'new_run' && (
                <>
                  <EuiFlexItem>
                    <EuiFlexGroup direction="row" gutterSize="l">
                      {ENABLED_TRIGGER_TABS.map((trigger) => (
                        <EuiFlexItem key={trigger}>
                          <EuiButton
                            color={selectedTrigger === trigger ? 'primary' : 'text'}
                            onClick={() => handleChangeTrigger(trigger)}
                            iconSide="right"
                            contentProps={{
                              style: {
                                justifyContent: 'flex-start',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                padding: selectedTrigger === trigger ? '10px' : '9px',
                                textAlign: 'left',
                              },
                            }}
                            css={css`
                              width: 100%;
                              height: fit-content;
                              min-height: 100%;
                              svg,
                              img {
                                margin-left: auto;
                              }
                            `}
                          >
                            <EuiRadio
                              name={TRIGGER_TABS_LABELS[trigger]}
                              label={TRIGGER_TABS_LABELS[trigger]}
                              id={trigger}
                              checked={selectedTrigger === trigger}
                              onChange={() => {}}
                            />
                            <EuiText
                              size="s"
                              css={css`
                                text-wrap: auto;
                                margin-left: ${euiTheme.size.l};
                              `}
                            >
                              {TRIGGER_TABS_DESCRIPTIONS[trigger]}
                            </EuiText>
                          </EuiButton>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </EuiFlexItem>

                  {selectedTrigger === 'alert' && (
                    <WorkflowExecuteEventForm
                      value={executionInput}
                      setValue={setExecutionInput}
                      errors={executionInputErrors}
                      setErrors={setExecutionInputErrors}
                    />
                  )}
                  {selectedTrigger === 'manual' && (
                    <WorkflowExecuteManualForm
                      definition={
                        definition
                          ? {
                              ...definition,
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              inputs: inputs as any,
                            }
                          : null
                      }
                      value={executionInput}
                      errors={executionInputErrors}
                      setErrors={setExecutionInputErrors}
                      setValue={setExecutionInput}
                    />
                  )}
                  {selectedTrigger === 'index' && (
                    <WorkflowExecuteIndexForm
                      value={executionInput}
                      setValue={setExecutionInput}
                      errors={executionInputErrors}
                      setErrors={setExecutionInputErrors}
                    />
                  )}
                </>
              )}

              {inputMode === 'replay' && (
                <WorkflowExecuteReplay
                  workflowId={workflowId}
                  selectedExecutionId={selectedReplayExecutionId}
                  onSelectionChange={setSelectedReplayExecutionId}
                  editorValue={replayEditorValue}
                  onEditorChange={setReplayEditorValue}
                  editorErrors={replayEditorErrors}
                  onEditorErrorsChange={setReplayEditorErrors}
                />
              )}
            </EuiFlexGroup>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton
              onClick={handleSubmit}
              iconType="play"
              disabled={
                inputMode === 'replay' ? isReplaySubmitDisabled : Boolean(executionInputErrors)
              }
              color="success"
              data-test-subj="executeWorkflowButton"
            >
              <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Run" ignoreTag />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </>
    );
  }
);
WorkflowExecuteModal.displayName = 'WorkflowExecuteModal';
