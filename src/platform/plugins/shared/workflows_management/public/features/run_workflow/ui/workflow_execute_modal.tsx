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
import capitalize from 'lodash/capitalize';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { parseDocument } from 'yaml';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowYaml } from '@kbn/workflows';
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import { useExecutionInput } from './use_execution_input/use_execution_input';
import { WorkflowExecuteEventForm } from './workflow_execute_event_form';
import { WorkflowExecuteIndexForm } from './workflow_execute_index_form';
import { WorkflowExecuteManualForm } from './workflow_execute_manual_form';
import { MANUAL_TRIGGERS_DESCRIPTIONS } from '../../../../common/translations';

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
  yamlString?: string | null;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}
export const WorkflowExecuteModal = React.memo<WorkflowExecuteModalProps>(
  ({ definition, workflowId, yamlString, onClose, onSubmit }) => {
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
      onSubmit(JSON.parse(executionInput));
      onClose();
    }, [onSubmit, onClose, executionInput]);

    const handleChangeTrigger = useCallback(
      (trigger: TriggerType): void => {
        setExecutionInput('');
        setSelectedTrigger(trigger);
      },
      [setExecutionInput, setSelectedTrigger]
    );

    const shouldAutoRun = useMemo(() => {
      if (!definition) {
        return false;
      }
      const hasAlertTrigger = definition.triggers?.some((trigger) => trigger.type === 'alert');

      // Try to get inputs from definition, or extract from YAML if available
      let inputs = definition.inputs;
      if (inputs === undefined && yamlString) {
        try {
          const yamlDoc = parseDocument(yamlString);
          const yamlJson = yamlDoc.toJSON();
          if (yamlJson && typeof yamlJson === 'object' && 'inputs' in yamlJson) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            inputs = (yamlJson as any).inputs;
          }
        } catch (e) {
          // Ignore errors when extracting from YAML
        }
      }

      const normalizedInputs = normalizeInputsToJsonSchema(inputs);
      const hasInputs =
        normalizedInputs?.properties && Object.keys(normalizedInputs.properties).length > 0;

      if (!hasAlertTrigger && !hasInputs) {
        return true;
      }
      return false;
    }, [definition, yamlString]);

    useEffect(() => {
      if (shouldAutoRun) {
        onSubmit({});
        onClose();
        return;
      }
      // Default trigger selection
      if (definition?.triggers?.some((trigger) => trigger.type === 'alert')) {
        setSelectedTrigger('alert');
        return;
      }

      // Try to get inputs from definition, or extract from YAML if available
      let inputs = definition?.inputs;
      if (inputs === undefined && yamlString && definition) {
        try {
          const yamlDoc = parseDocument(yamlString);
          const yamlJson = yamlDoc.toJSON();
          if (yamlJson && typeof yamlJson === 'object' && 'inputs' in yamlJson) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            inputs = (yamlJson as any).inputs;
          }
        } catch (e) {
          // Ignore errors when extracting from YAML
        }
      }

      const normalizedInputs = inputs ? normalizeInputsToJsonSchema(inputs) : undefined;
      if (normalizedInputs?.properties && Object.keys(normalizedInputs.properties).length > 0) {
        setSelectedTrigger('manual');
      }
    }, [shouldAutoRun, onSubmit, onClose, definition, yamlString]);

    if (shouldAutoRun) {
      // Not rendered if the workflow should auto run, will close the modal automatically
      return null;
    }

    return (
      <>
        {/*
        The following Global CSS is needed to ensure that modal will not overlay SearchBar's
        autocomplete popup
      */}
        <Global
          styles={css`
            .euiOverlayMask:has(.workflowExecuteModal) {
              z-index: 4000;
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
            <EuiModalHeaderTitle id={modalTitleId}>{'Run Workflow'}</EuiModalHeaderTitle>
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
                definition={definition}
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
