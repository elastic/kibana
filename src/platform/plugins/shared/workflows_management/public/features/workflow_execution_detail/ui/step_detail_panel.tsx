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
import type { ResumeSubmitState } from '../model/use_resume_submit_state';
import type { SelectedStepExecution } from '../model/use_selected_step_execution';
import { useSelectedStepExecution } from '../model/use_selected_step_execution';
import { useStepAi } from '../model/use_step_ai';
import type { WaitingStepResume } from '../model/use_waiting_step_resume';
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
  workflowExecution: WorkflowExecutionDto | undefined;
  waitingResume: WaitingStepResume;
  resumeSubmitState: ResumeSubmitState;
}

type ResumeKind = 'child' | 'own';

/** Which run, if any, the selected step's resume button resumes. A waiting child step wins. */
const getResumeKind = ({
  detail,
  selectedStepExecutionId,
  executionId,
  waitingStepExecutionId,
}: {
  detail: SelectedStepExecution;
  selectedStepExecutionId: string;
  executionId: string;
  waitingStepExecutionId: string | undefined;
}): ResumeKind | null => {
  const { isPseudoStep, selectedLightStep, activeStepExecution, resolvedExecutionId } = detail;
  if (isPseudoStep) return null;

  const isWaitingForInput =
    selectedLightStep?.status === ExecutionStatus.WAITING_FOR_INPUT ||
    activeStepExecution?.status === ExecutionStatus.WAITING_FOR_INPUT;
  // An injected child step is not the parent run's wait. Resume that child run.
  if (isWaitingForInput && resolvedExecutionId !== executionId) return 'child';

  if (Boolean(waitingStepExecutionId) && selectedStepExecutionId === waitingStepExecutionId) {
    return 'own';
  }
  return null;
};

interface ChildStepResumeButtonProps {
  detail: SelectedStepExecution;
  selectedStepExecutionId: string;
  stepStartedAt: string | undefined;
}

const ChildStepResumeButton = ({
  detail,
  selectedStepExecutionId,
  stepStartedAt,
}: ChildStepResumeButtonProps) => {
  const { selectedLightStep, activeStepExecution, resolvedExecutionId } = detail;
  const selectedStepForResume = activeStepExecution ?? selectedLightStep;

  return (
    <ResumeExecutionButton
      executionId={resolvedExecutionId}
      workflowId={selectedStepForResume?.workflowId}
      stepStartedAt={stepStartedAt}
      resumeMessage={resumeMessageForStepExecution(selectedStepForResume ?? undefined)}
      resumeSchema={resumeSchemaForStepExecution(selectedStepForResume ?? undefined)}
      approvalLabels={approvalLabelsForStepExecution(selectedStepForResume ?? {})}
      waitingStepExecutionId={selectedStepExecutionId}
      submitState={undefined}
    />
  );
};

interface OwnStepResumeButtonProps {
  selectedStepExecutionId: string;
  executionId: string;
  workflowExecution: WorkflowExecutionDto | undefined;
  waitingResume: WaitingStepResume;
  resumeSubmitState: ResumeSubmitState;
  stepStartedAt: string | undefined;
}

const OwnStepResumeButton = ({
  selectedStepExecutionId,
  executionId,
  workflowExecution,
  waitingResume,
  resumeSubmitState,
  stepStartedAt,
}: OwnStepResumeButtonProps) => (
  <ResumeExecutionButton
    executionId={executionId}
    workflowId={workflowExecution?.workflowId}
    stepStartedAt={stepStartedAt}
    resumeMessage={waitingResume.resumeMessage}
    resumeSchema={waitingResume.resumeSchema}
    approvalLabels={waitingResume.approvalLabels}
    waitingStepExecutionId={selectedStepExecutionId}
    submitState={resumeSubmitState}
  />
);

/** Resume button for the selected step when it is the run's wait, or a waiting child step. */
const StepResumeAction = ({
  detail,
  selectedStepExecutionId,
  executionId,
  workflowExecution,
  waitingResume,
  resumeSubmitState,
}: StepResumeActionProps) => {
  const { euiTheme } = useEuiTheme();
  const resumeKind = getResumeKind({
    detail,
    selectedStepExecutionId,
    executionId,
    waitingStepExecutionId: waitingResume.waitingStepExecutionId,
  });

  if (!resumeKind) return null;

  const { selectedLightStep, activeStepExecution } = detail;
  const stepStartedAt =
    selectedLightStep?.startedAt ??
    activeStepExecution?.startedAt ??
    waitingResume.waitingStepStartedAt;

  return (
    <div
      css={{
        paddingTop: euiTheme.size.m,
        paddingBottom: euiTheme.size.m,
      }}
    >
      {resumeKind === 'child' ? (
        <ChildStepResumeButton
          detail={detail}
          selectedStepExecutionId={selectedStepExecutionId}
          stepStartedAt={stepStartedAt}
        />
      ) : (
        <OwnStepResumeButton
          selectedStepExecutionId={selectedStepExecutionId}
          executionId={executionId}
          workflowExecution={workflowExecution}
          waitingResume={waitingResume}
          resumeSubmitState={resumeSubmitState}
          stepStartedAt={stepStartedAt}
        />
      )}
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
  waitingResume: WaitingStepResume;
  resumeSubmitState: ResumeSubmitState;
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
  waitingResume,
  resumeSubmitState,
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
        workflowExecution={workflowExecution}
        waitingResume={waitingResume}
        resumeSubmitState={resumeSubmitState}
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
  waitingResume: WaitingStepResume;
  resumeSubmitState: ResumeSubmitState;
  onSelectStep: (stepExecutionId: string | null) => void;
}

/** Detail column for the step selected in the execution flyout. */
export const StepDetailPanel = ({
  selectedStepExecutionId,
  executionId,
  workflowExecution,
  childExecutions,
  waitingResume,
  resumeSubmitState,
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
            waitingResume={waitingResume}
            resumeSubmitState={resumeSubmitState}
            onSelectStep={onSelectStep}
          />
        )}
      </div>
    </div>
  );
};
