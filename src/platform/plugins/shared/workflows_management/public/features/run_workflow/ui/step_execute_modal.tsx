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
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { z } from '@kbn/zod/v4';
import { ENABLED_STEP_TRIGGER_TABS } from './constants';
import { NOT_READY_SENTINEL, StepExecuteHistoricalForm } from './step_execute_historical_form';
import { StepExecuteManualForm } from './step_execute_manual_form';
import type { WorkflowStepTriggerTab } from './types';
import { sanitizeText } from '../../../shared/lib/sanitize_text';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import { useWorkflowsMonacoTheme } from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';

const STEP_TAB_LABELS: Record<WorkflowStepTriggerTab, string> = {
  manual: i18n.translate('workflows.testStepModal.manualTab', { defaultMessage: 'Manual' }),
  historical: i18n.translate('workflows.testStepModal.historicalTab', {
    defaultMessage: 'Historical',
  }),
};

const STEP_TAB_DESCRIPTIONS: Record<WorkflowStepTriggerTab, string> = {
  manual: i18n.translate('workflows.testStepModal.manualTabDescription', {
    defaultMessage: 'Provide custom JSON data manually',
  }),
  historical: i18n.translate('workflows.testStepModal.historicalTabDescription', {
    defaultMessage: 'Reuse input data from previous step executions',
  }),
};

export interface StepExecuteModalProps {
  initialcontextOverride: ContextOverrideData;
  onSubmit?: (params: {
    stepInputs: Record<string, unknown>;
    executionContext?: Record<string, unknown>;
    triggerTab: WorkflowStepTriggerTab;
  }) => void;
  onClose: () => void;
  initialStepExecutionId?: string;
  initialWorkflowRunId?: string;
  stepId: string;
  workflowGraph?: WorkflowGraph;
}

export const StepExecuteModal = React.memo<StepExecuteModalProps>(
  ({
    initialcontextOverride,
    onClose,
    onSubmit,
    initialStepExecutionId,
    initialWorkflowRunId,
    stepId,
    workflowGraph,
  }) => {
    useWorkflowsMonacoTheme();
    const { euiTheme } = useEuiTheme();
    const stepContextOverride = useMemo(
      () => initialcontextOverride.stepContext ?? {},
      [initialcontextOverride.stepContext]
    );
    const [selectedTab, setSelectedTab] = useState<WorkflowStepTriggerTab>(
      initialStepExecutionId ? 'historical' : 'manual'
    );
    const [inputsJson, setInputsJson] = useState<string>(
      JSON.stringify(stepContextOverride, null, 2)
    );
    const [executionContext, setExecutionContext] = useState<Record<string, unknown> | undefined>();
    const [executionInputErrors, setExecutionInputErrors] = useState<string | null>(null);
    const [executionInputWarnings, setExecutionInputWarnings] = useState<string | null>(null);

    const contextJsonSchema = useMemo(
      () => z.toJSONSchema(initialcontextOverride.schema, { target: 'draft-7' }),
      [initialcontextOverride.schema]
    );

    // Validate inputs on initial load and when json definition changes (same for manual and historical tabs)
    useEffect(() => {
      if (inputsJson) {
        let parsedJson = null;
        try {
          parsedJson = JSON.parse(inputsJson);
          setExecutionInputErrors(null);
        } catch (e: Error | unknown) {
          setExecutionInputWarnings(null);
          setExecutionInputErrors(
            i18n.translate('workflows.workflowExecuteManualForm.invalidJson', {
              defaultMessage: 'Invalid JSON: {message}',
              values: { message: e instanceof Error ? e.message : String(e) },
            })
          );
        }
        if (parsedJson) {
          const res = initialcontextOverride.schema.safeParse(parsedJson);
          if (!res.success) {
            setExecutionInputWarnings(
              res.error.issues
                .map((e) => (e.path.length > 0 ? `${e.path.join('.')}: ${e.message}` : e.message))
                .join(', ')
            );
          } else {
            setExecutionInputWarnings(null);
          }
        }
      }
    }, [initialcontextOverride.schema, inputsJson, setExecutionInputErrors]);

    const modalTitleId = useGeneratedHtmlId();

    const handleInputChange = useCallback((value: string) => {
      setInputsJson(sanitizeText(value));
    }, []);

    const handleChangeTab = useCallback(
      (tab: WorkflowStepTriggerTab) => {
        setInputsJson(JSON.stringify(stepContextOverride, null, 2));
        setExecutionInputErrors(null);
        setSelectedTab(tab);
      },
      [stepContextOverride]
    );

    const handleSubmit = useCallback(() => {
      if (onSubmit) {
        onSubmit({
          stepInputs: JSON.parse(inputsJson),
          executionContext,
          triggerTab: selectedTab,
        });
      }
    }, [onSubmit, inputsJson, executionContext, selectedTab]);

    const isSubmitDisabled =
      (selectedTab === 'historical' && executionInputErrors !== null) ||
      executionInputErrors === NOT_READY_SENTINEL;

    return (
      <EuiModal
        aria-labelledby={modalTitleId}
        maxWidth={false}
        onClose={onClose}
        data-test-subj="workflowTestStepModal"
        style={{ width: '1200px', height: '100vh' }}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem>
                <FormattedMessage
                  id="workflows.testStepModal.title"
                  defaultMessage='Test "{stepName}" step'
                  values={{ stepName: stepId }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody
          css={css`
            border-top: ${euiTheme.colors.borderBasePlain};
            border-bottom: ${euiTheme.colors.borderBasePlain};
            .euiModalBody__overflow {
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
              padding-inline: 0;
              overflow: hidden;
            }
          `}
        >
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            css={css`
              min-height: 0;
            `}
          >
            <EuiFlexItem
              grow={false}
              css={css`
                padding: 0 ${euiTheme.size.l};
              `}
            >
              <EuiFlexGroup direction="row" gutterSize="m">
                {ENABLED_STEP_TRIGGER_TABS.map((tab) => (
                  <EuiFlexItem key={tab}>
                    <EuiButton
                      color={selectedTab === tab ? 'primary' : 'text'}
                      onClick={() => handleChangeTab(tab)}
                      iconSide="right"
                      contentProps={{
                        style: {
                          justifyContent: 'flex-start',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          textAlign: 'left',
                        },
                      }}
                      css={css`
                        width: 100%;
                        height: fit-content;
                        min-height: 100%;
                        padding: ${euiTheme.size.m};
                      `}
                    >
                      <EuiRadio
                        name={STEP_TAB_LABELS[tab]}
                        label={STEP_TAB_LABELS[tab]}
                        id={`test-step-tab-${tab}`}
                        checked={selectedTab === tab}
                        onChange={() => {}}
                        css={{ fontWeight: euiTheme.font.weight.bold }}
                      />
                      <EuiText
                        size="s"
                        css={css`
                          text-wrap: auto;
                          margin-left: ${euiTheme.size.l};
                        `}
                      >
                        {STEP_TAB_DESCRIPTIONS[tab]}
                      </EuiText>
                    </EuiButton>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem
              css={css`
                overflow: hidden;
                background-color: ${euiTheme.colors.backgroundBaseSubdued};
                padding: ${euiTheme.size.m} ${euiTheme.size.l};
              `}
            >
              {selectedTab === 'manual' && (
                <StepExecuteManualForm
                  value={inputsJson}
                  setValue={handleInputChange}
                  errors={executionInputErrors}
                  warnings={executionInputWarnings}
                  contextJsonSchema={contextJsonSchema}
                />
              )}
              {selectedTab === 'historical' && (
                <StepExecuteHistoricalForm
                  value={inputsJson}
                  setValue={handleInputChange}
                  setExecutionContext={setExecutionContext}
                  warnings={executionInputWarnings}
                  errors={executionInputErrors}
                  setErrors={setExecutionInputErrors}
                  initialStepExecutionId={initialStepExecutionId ?? undefined}
                  initialWorkflowRunId={initialWorkflowRunId ?? undefined}
                  stepId={stepId}
                  contextJsonSchema={contextJsonSchema}
                  workflowGraph={workflowGraph}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButton
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            color="success"
            iconType="play"
            size="s"
            data-test-subj="workflowSubmitStepRun"
          >
            <FormattedMessage id="workflows.testStepModal.submitRunBtn" defaultMessage="Run" />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
StepExecuteModal.displayName = 'StepExecuteModal';
