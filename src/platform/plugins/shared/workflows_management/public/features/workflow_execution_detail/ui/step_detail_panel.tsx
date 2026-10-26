/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { AiStepSection } from './ai_step_section';
import { ForeachIterationsSection } from './foreach_iterations_section';
import { NestedWorkflowExecutionLinks } from './nested_workflow_execution_links';
import { ResumeExecutionButton } from './resume_execution_button';
import { StepDataSection } from './step_data_section';
import { isOverviewContextField } from './workflow_pseudo_step_context';
import { formatDuration } from '../../../shared/lib/format_duration';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { TokenUsageBreakdown } from '../../../shared/ui/token_usage_badge/token_usage_breakdown';
import { getStepFieldPathPrefix } from '../lib/get_step_field_path_prefix';
import type { ChildWorkflowExecutionsMap } from '../model/use_child_workflow_executions';
import type { SelectedStepExecution } from '../model/use_selected_step_execution';
import { useSelectedStepExecution } from '../model/use_selected_step_execution';
import { useStepAi } from '../model/use_step_ai';
import {
  approvalLabelsForStepExecution,
  resumeMessageForStepExecution,
  resumeSchemaForStepExecution,
} from '../model/use_waiting_step_resume';

/** Hard constant: content must not flex the panels. */
export const STEP_DETAIL_WIDTH = 560;

const closeLabel = i18n.translate('workflows.executionFlyout.close', { defaultMessage: 'Close' });

interface StepDetailHeaderProps {
  stepName: string;
  stepType: string | undefined;
  status: ExecutionStatus | undefined;
  onClose: () => void;
}

const StepDetailHeader = ({ stepName, stepType, status, onClose }: StepDetailHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: euiTheme.size.s,
        flexShrink: 0,
        boxSizing: 'border-box',
        // AppHeader compact: 8px padding + 32px control = 48px.
        minHeight: 48,
        paddingBlock: euiTheme.size.s,
        paddingInline: euiTheme.size.s,
        borderBottom: euiTheme.border.thin,
      }}
    >
      {stepType && (
        <StepIcon stepType={stepType} executionStatus={status} size="m" css={{ flexShrink: 0 }} />
      )}
      <EuiTitle
        size="xs"
        css={{
          flex: 1,
          minWidth: 0,
          marginBottom: 0,
        }}
      >
        <h2
          css={{
            minWidth: 0,
            margin: 0,
            color: euiTheme.colors.title,
          }}
        >
          <EuiTextTruncate text={stepName} />
        </h2>
      </EuiTitle>
      <EuiToolTip content={closeLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="cross"
          aria-label={closeLabel}
          color="text"
          size="s"
          iconSize="m"
          onClick={onClose}
          data-test-subj="workflowExecutionFlyoutStepClose"
        />
      </EuiToolTip>
    </div>
  );
};

interface StepResumeActionProps {
  detail: SelectedStepExecution;
  selectedStepExecutionId: string;
  executionId: string;
}

/**
 * Resume button for a waiting child step. The run's own wait is resumed from the header,
 * so the step panel only carries child runs.
 */
const StepResumeAction = ({
  detail,
  selectedStepExecutionId,
  executionId,
}: StepResumeActionProps) => {
  const { euiTheme } = useEuiTheme();
  const { isPseudoStep, selectedLightStep, activeStepExecution, resolvedExecutionId } = detail;

  const isWaitingForInput =
    selectedLightStep?.status === ExecutionStatus.WAITING_FOR_INPUT ||
    activeStepExecution?.status === ExecutionStatus.WAITING_FOR_INPUT;
  // An injected child step is not the parent run's wait. Resume that child run.
  if (isPseudoStep || !isWaitingForInput || resolvedExecutionId === executionId) return null;

  const selectedStepForResume = activeStepExecution ?? selectedLightStep;

  return (
    <div
      css={{
        paddingTop: euiTheme.size.m,
        paddingBottom: euiTheme.size.m,
      }}
    >
      <ResumeExecutionButton
        executionId={resolvedExecutionId}
        workflowId={selectedStepForResume?.workflowId}
        stepStartedAt={selectedLightStep?.startedAt ?? activeStepExecution?.startedAt}
        resumeMessage={resumeMessageForStepExecution(selectedStepForResume ?? undefined)}
        resumeSchema={resumeSchemaForStepExecution(selectedStepForResume ?? undefined)}
        approvalLabels={approvalLabelsForStepExecution(selectedStepForResume ?? {})}
        waitingStepExecutionId={selectedStepExecutionId}
      />
    </div>
  );
};

interface StepOutcomeSectionProps {
  detail: SelectedStepExecution;
  selectedStepExecutionId: string;
  stepId: string;
  stepType: string | undefined;
  hasStepError: boolean;
}

/** The step's error when it failed, otherwise its output. */
const StepOutcomeSection = ({
  detail,
  selectedStepExecutionId,
  stepId,
  stepType,
  hasStepError,
}: StepOutcomeSectionProps) => {
  const { isPseudoStep, activeStepExecution } = detail;
  /** Real foreach/while output only — never synthesize child step listings as Output. */
  const stepOutputData = hasStepError ? activeStepExecution?.error : activeStepExecution?.output;
  const stepOutputFieldPathPrefix = getStepFieldPathPrefix({
    stepId,
    stepType,
    mode: 'output',
    hasError: hasStepError,
  });

  if (isPseudoStep) return null;

  if (hasStepError) {
    return (
      <StepDataSection
        key={`error-${selectedStepExecutionId}`}
        data-test-subj="workflowStepDataSection_error"
        label={i18n.translate('workflows.executionFlyout.stepDetail.error', {
          defaultMessage: 'Error',
        })}
        data={activeStepExecution?.error}
      />
    );
  }

  if (stepOutputData == null) return null;

  return (
    <StepDataSection
      key={`output-${selectedStepExecutionId}`}
      data-test-subj="workflowStepDataSection_output"
      label={i18n.translate('workflows.executionFlyout.stepDetail.output', {
        defaultMessage: 'Output',
      })}
      data={stepOutputData}
      fieldPathPrefix={stepOutputFieldPathPrefix}
    />
  );
};

interface StepDetailContentProps {
  detail: SelectedStepExecution;
  selectedStepExecutionId: string;
  executionId: string;
  workflowExecution: WorkflowExecutionDto | undefined;
  stepId: string;
  stepType: string | undefined;
  hasStepError: boolean;
  stepInputFieldPathPrefix: string | undefined;
  stepAi: ReturnType<typeof useStepAi>;
  onSelectStep: (stepExecutionId: string | null) => void;
}

const CaseBranchStepDetail = ({
  detail,
  selectedStepExecutionId,
}: Pick<StepDetailContentProps, 'detail' | 'selectedStepExecutionId'>) => (
  <StepDataSection
    key={`status-${selectedStepExecutionId}`}
    data-test-subj="workflowStepDataSection_status"
    label={i18n.translate('workflows.executionFlyout.caseBranch.statusLabel', {
      defaultMessage: 'Status',
    })}
    data={{
      result:
        detail.activeStepExecution?.status === ExecutionStatus.COMPLETED
          ? i18n.translate('workflows.executionFlyout.caseBranch.taken', {
              defaultMessage: 'Branch executed',
            })
          : i18n.translate('workflows.executionFlyout.caseBranch.skipped', {
              defaultMessage: 'Branch not taken',
            }),
    }}
  />
);

const IterationStepDetail = ({
  detail,
  selectedStepExecutionId,
  stepInputFieldPathPrefix,
}: Pick<
  StepDetailContentProps,
  'detail' | 'selectedStepExecutionId' | 'stepInputFieldPathPrefix'
>) => {
  const { euiTheme } = useEuiTheme();
  const { activeStepExecution } = detail;

  return (
    <>
      {activeStepExecution?.executionTimeMs != null && activeStepExecution.executionTimeMs > 0 && (
        <div css={{ flexShrink: 0 }}>
          <div
            css={{
              paddingTop: euiTheme.size.m,
              paddingBottom: euiTheme.size.m,
            }}
          >
            <EuiText size="s" color="subdued" data-test-subj="iterationPseudoStepDuration">
              {i18n.translate('workflows.executionFlyout.iteration.duration', {
                defaultMessage: 'Duration: {duration}',
                values: {
                  duration: formatDuration(activeStepExecution.executionTimeMs),
                },
              })}
            </EuiText>
          </div>
          <EuiHorizontalRule margin="none" />
        </div>
      )}
      {activeStepExecution?.usage && activeStepExecution.usage.totalTokens > 0 && (
        <TokenUsageBreakdown
          usage={activeStepExecution.usage}
          data-test-subj="iterationPseudoStepTokenUsage"
        />
      )}
      <StepDataSection
        key={`input-${selectedStepExecutionId}`}
        data-test-subj="workflowStepDataSection_input"
        label={i18n.translate('workflows.executionFlyout.stepDetail.input', {
          defaultMessage: 'Input',
        })}
        data={activeStepExecution?.input}
        fieldPathPrefix={stepInputFieldPathPrefix}
      />
    </>
  );
};

const RegularStepDetail = ({
  detail,
  selectedStepExecutionId,
  executionId,
  workflowExecution,
  stepId,
  stepType,
  hasStepError,
  stepInputFieldPathPrefix,
  stepAi,
  onSelectStep,
}: StepDetailContentProps) => {
  const { isPseudoStep, executionMetadata, activeStepExecution } = detail;
  const isForeachOrWhileStep = stepType === 'foreach' || stepType === 'while';
  const metadataFieldPathPrefix = getStepFieldPathPrefix({
    stepId: 'Overview',
    stepType: '__overview',
    mode: 'input',
  });

  return (
    <>
      {executionMetadata && (
        <StepDataSection
          key={`metadata-${selectedStepExecutionId}`}
          data-test-subj="workflowStepDataSection_metadata"
          label={i18n.translate('workflows.executionFlyout.stepDetail.metadata', {
            defaultMessage: 'Metadata',
          })}
          data={executionMetadata}
          fieldPathPrefix={metadataFieldPathPrefix}
          isFieldPathCopyable={isOverviewContextField}
        />
      )}
      {!isPseudoStep && stepAi.stepAiWithModel && (
        <AiStepSection ai={stepAi.stepAiWithModel} connectorName={stepAi.aiConnectorName} />
      )}
      <StepResumeAction
        detail={detail}
        selectedStepExecutionId={selectedStepExecutionId}
        executionId={executionId}
      />
      <StepDataSection
        key={`input-${selectedStepExecutionId}`}
        data-test-subj="workflowStepDataSection_input"
        label={i18n.translate('workflows.executionFlyout.stepDetail.input', {
          defaultMessage: 'Input',
        })}
        data={activeStepExecution?.input}
        fieldPathPrefix={stepInputFieldPathPrefix}
      />
      {!isPseudoStep &&
        isForeachOrWhileStep &&
        activeStepExecution &&
        workflowExecution?.stepExecutions && (
          <ForeachIterationsSection
            foreachStep={activeStepExecution}
            allStepExecutions={workflowExecution.stepExecutions}
            selectedId={selectedStepExecutionId}
            onSelectStep={onSelectStep}
            executionStatus={workflowExecution.status}
          />
        )}
      <StepOutcomeSection
        detail={detail}
        selectedStepExecutionId={selectedStepExecutionId}
        stepId={stepId}
        stepType={stepType}
        hasStepError={hasStepError}
      />
    </>
  );
};

const StepDetailContent = (props: StepDetailContentProps) => {
  const { detail } = props;

  if (detail.activeStepExecution?.stepType === 'enter-case-branch') {
    return <CaseBranchStepDetail {...props} />;
  }
  if (detail.isIterationPseudoStep) {
    return <IterationStepDetail {...props} />;
  }
  return <RegularStepDetail {...props} />;
};

interface StepDetailPanelProps {
  selectedStepExecutionId: string;
  executionId: string;
  workflowExecution: WorkflowExecutionDto | undefined;
  childExecutions: ChildWorkflowExecutionsMap;
  onSelectStep: (stepExecutionId: string | null) => void;
}

/** Detail column for the step selected in the execution flyout. */
export const StepDetailPanel = ({
  selectedStepExecutionId,
  executionId,
  workflowExecution,
  childExecutions,
  onSelectStep,
}: StepDetailPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const detail = useSelectedStepExecution({
    selectedStepExecutionId,
    executionId,
    workflowExecution,
    childExecutions,
  });
  const {
    isPseudoStep,
    selectedLightStep,
    activeStepExecution,
    childWorkflowExecution,
    parentWorkflowExecution,
    isLoadingStepData,
  } = detail;

  const stepId = selectedLightStep?.stepId ?? activeStepExecution?.stepId ?? '';
  const stepType = selectedLightStep?.stepType ?? activeStepExecution?.stepType;
  const hasStepError = !isPseudoStep && activeStepExecution?.error != null;
  const stepAi = useStepAi({
    workflowDefinition: workflowExecution?.workflowDefinition ?? null,
    stepId,
    activeStepExecution,
  });
  const stepInputFieldPathPrefix = getStepFieldPathPrefix({
    stepId,
    stepType,
    mode: 'input',
    hasError: hasStepError,
  });

  return (
    <div
      css={{
        width: `${STEP_DETAIL_WIDTH}px`,
        minWidth: `${STEP_DETAIL_WIDTH}px`,
        maxWidth: `${STEP_DETAIL_WIDTH}px`,
        flex: `0 0 ${STEP_DETAIL_WIDTH}px`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        overflow: 'hidden',
      }}
    >
      <StepDetailHeader
        stepName={stepId}
        stepType={stepType}
        status={selectedLightStep?.status ?? activeStepExecution?.status}
        onClose={() => onSelectStep(null)}
      />

      <div
        css={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          // No paddingTop — the first accordion already has header padding.
          paddingInline: euiTheme.size.base,
          paddingBottom: euiTheme.size.base,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          minWidth: 0,
        }}
      >
        {!isPseudoStep && (childWorkflowExecution || parentWorkflowExecution) && (
          <div
            css={{
              paddingTop: euiTheme.size.m,
              paddingBottom: euiTheme.size.m,
            }}
          >
            <NestedWorkflowExecutionLinks
              stepExecution={activeStepExecution ?? selectedLightStep}
              childWorkflowExecution={childWorkflowExecution}
              parentWorkflowExecution={parentWorkflowExecution}
            />
          </div>
        )}
        {isLoadingStepData && !isPseudoStep ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <StepDetailContent
            detail={detail}
            selectedStepExecutionId={selectedStepExecutionId}
            executionId={executionId}
            workflowExecution={workflowExecution}
            stepId={stepId}
            stepType={stepType}
            hasStepError={hasStepError}
            stepInputFieldPathPrefix={stepInputFieldPathPrefix}
            stepAi={stepAi}
            onSelectStep={onSelectStep}
          />
        )}
      </div>
    </div>
  );
};
