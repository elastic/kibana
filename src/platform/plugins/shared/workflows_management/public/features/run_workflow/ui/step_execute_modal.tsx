/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  euiFontSize,
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
import React, { useCallback, useMemo, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { z } from '@kbn/zod/v4';
import { NOT_READY_SENTINEL, StepExecuteHistoricalForm } from './step_execute_historical_form';
import { StepExecuteManualForm } from './step_execute_manual_form';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import { useWorkflowsMonacoTheme } from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';

const STEP_INPUT_TABS = ['manual', 'historical'] as const;
type StepInputTab = (typeof STEP_INPUT_TABS)[number];

const STEP_TAB_LABELS: Record<StepInputTab, string> = {
  manual: i18n.translate('workflows.testStepModal.manualTab', { defaultMessage: 'Manual' }),
  historical: i18n.translate('workflows.testStepModal.historicalTab', {
    defaultMessage: 'Historical',
  }),
};

const STEP_TAB_DESCRIPTIONS: Record<StepInputTab, string> = {
  manual: i18n.translate('workflows.testStepModal.manualTabDescription', {
    defaultMessage: 'Enter or edit JSON input manually.',
  }),
  historical: i18n.translate('workflows.testStepModal.historicalTabDescription', {
    defaultMessage: 'Reuse input from a previous step run.',
  }),
};

export interface StepExecuteModalProps {
  initialcontextOverride: ContextOverrideData;
  onSubmit?: (params: { stepInputs: Record<string, any> }) => void;
  onClose: () => void;
  initialStepExecutionId?: string;
  initialWorkflowRunId?: string;
  initialTab?: StepInputTab;
  stepId: string;
}

export const StepExecuteModal = React.memo<StepExecuteModalProps>(
  ({
    initialcontextOverride,
    onClose,
    onSubmit,
    initialStepExecutionId,
    initialWorkflowRunId,
    initialTab,
    stepId,
  }) => {
    const styles = useMemoCss(componentStyles);
    useWorkflowsMonacoTheme();
    const { euiTheme } = useEuiTheme();
    const initialInputs = useMemo(
      () => initialcontextOverride.stepContext.inputs ?? {},
      [initialcontextOverride.stepContext.inputs]
    );
    const [selectedTab, setSelectedTab] = useState<StepInputTab>(
      initialTab ?? (initialStepExecutionId ? 'historical' : 'manual')
    );
    const [inputsJson, setInputsJson] = React.useState<string>(
      JSON.stringify(initialInputs, null, 2)
    );
    const [stepInputs, setStepInputs] = useState<Record<string, unknown>>(initialInputs);
    const [executionInputErrors, setExecutionInputErrors] = useState<string | null>(null);

    const inputsJsonSchema = useMemo(() => {
      if (
        initialcontextOverride.schema instanceof z.ZodObject &&
        initialcontextOverride.schema.shape.inputs
      ) {
        return z.toJSONSchema(initialcontextOverride.schema.shape.inputs, { target: 'draft-7' });
      }
      return undefined;
    }, [initialcontextOverride.schema]);

    const modalTitleId = useGeneratedHtmlId();

    const handleInputChange = useCallback((value: string) => {
      setInputsJson(value);
      try {
        setStepInputs(JSON.parse(value));
        setExecutionInputErrors(null);
      } catch (error) {
        setExecutionInputErrors(
          i18n.translate('workflows.testStepModal.invalidJsonError', {
            defaultMessage: 'Invalid JSON: {message}',
            values: {
              message: error instanceof Error ? error.message : String(error),
            },
          })
        );
      }
    }, []);

    const handleChangeTab = useCallback(
      (tab: StepInputTab) => {
        setInputsJson(JSON.stringify(initialInputs, null, 2));
        setStepInputs(initialInputs);
        setExecutionInputErrors(null);
        setSelectedTab(tab);
      },
      [initialInputs]
    );

    const handleSubmit = useCallback(() => {
      if (onSubmit) {
        onSubmit({ stepInputs: { inputs: stepInputs } });
      }
    }, [onSubmit, stepInputs]);

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
              padding-inline: 0;
            }
          `}
        >
          <EuiFlexGroup direction="column" gutterSize="m" css={{ height: '100%' }}>
            <EuiFlexItem css={{ padding: euiTheme.size.m }} grow={false}>
              <EuiFlexGroup direction="row" gutterSize="s">
                {STEP_INPUT_TABS.map((tab) => (
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
                          padding: selectedTab === tab ? '10px' : '9px',
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
                        name={STEP_TAB_LABELS[tab]}
                        label={STEP_TAB_LABELS[tab]}
                        id={`test-step-tab-${tab}`}
                        checked={selectedTab === tab}
                        onChange={() => {}}
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
              css={{
                backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                padding: euiTheme.size.m,
              }}
            >
              {selectedTab === 'manual' && (
                <StepExecuteManualForm
                  value={inputsJson}
                  onChange={handleInputChange}
                  errors={executionInputErrors}
                  inputsJsonSchema={inputsJsonSchema}
                />
              )}
              {selectedTab === 'historical' && (
                <StepExecuteHistoricalForm
                  value={inputsJson}
                  setValue={handleInputChange}
                  errors={executionInputErrors}
                  setErrors={setExecutionInputErrors}
                  initialStepExecutionId={initialStepExecutionId ?? undefined}
                  initialWorkflowRunId={initialWorkflowRunId ?? undefined}
                  stepId={stepId}
                  inputsJsonSchema={inputsJsonSchema}
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

const componentStyles = {
  description: (euiThemeContext: UseEuiTheme) =>
    css({
      ...euiFontSize(euiThemeContext, 's'),
      fontWeight: 'normal',
    }),
};
