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
  EuiFlexGroup,
  EuiFlexItem,
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
import { capitalize } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { parseDocument } from 'yaml';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowYaml } from '@kbn/workflows';
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import { useExecutionInput } from './use_execution_input/use_execution_input';
import { WorkflowExecuteEventForm } from './workflow_execute_event_form';
import { WorkflowExecuteIndexForm } from './workflow_execute_index_form';
import { WorkflowExecuteManualForm } from './workflow_execute_manual_form';
import { MANUAL_TRIGGERS_DESCRIPTIONS } from '../../../../common/translations';
import type { WorkflowTriggerTab } from '../../../common/lib/telemetry/events/workflows/execution/types';

type TriggerType = 'manual' | 'index' | 'alert';

function getDefaultTrigger(definition: WorkflowYaml | null): TriggerType {
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

interface WorkflowExecuteModalProps {
  definition: WorkflowYaml | null;
  workflowId?: string;
  isTestRun: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>, triggerTab?: WorkflowTriggerTab) => void;
  yamlString?: string;
}
export const WorkflowExecuteModal = React.memo<WorkflowExecuteModalProps>(
  ({ definition, workflowId, onClose, onSubmit, isTestRun, yamlString }) => {
    const modalTitleId = useGeneratedHtmlId();
    const enabledTriggers = ['alert', 'index', 'manual'];
    const defaultTrigger = useMemo(() => getDefaultTrigger(definition), [definition]);
    const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>(defaultTrigger);

    const { executionInput, setExecutionInput } = useExecutionInput({
      workflowName: definition?.name || '',
      workflowId,
      selectedTrigger,
    });
    const [executionInputErrors, setExecutionInputErrors] = useState<string | null>(null);

    const { euiTheme } = useEuiTheme();

    const handleSubmit = useCallback(() => {
      onSubmit(JSON.parse(executionInput), selectedTrigger);
      onClose();
    }, [onSubmit, onClose, executionInput, selectedTrigger]);

    const handleChangeTrigger = useCallback(
      (trigger: TriggerType): void => {
        setExecutionInput('');
        setSelectedTrigger(trigger);
      },
      [setExecutionInput, setSelectedTrigger]
    );

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
        onSubmit({}, 'manual'); // Auto-run defaults to manual trigger
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
          data-test-subj="workflowExecuteModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              {i18n.translate(modalTitle.id, { defaultMessage: modalTitle.defaultMessage })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFlexGroup direction="row" gutterSize="l">
              {enabledTriggers.map((trigger) => (
                <EuiFlexItem key={trigger}>
                  <EuiButton
                    color={selectedTrigger === trigger ? 'primary' : 'text'}
                    onClick={() => handleChangeTrigger(trigger as TriggerType)}
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
                      name={capitalize(trigger)}
                      label={capitalize(trigger)}
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
                      {MANUAL_TRIGGERS_DESCRIPTIONS[trigger]}
                    </EuiText>
                  </EuiButton>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>

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
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton
              onClick={handleSubmit}
              iconType="play"
              disabled={Boolean(executionInputErrors)}
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
