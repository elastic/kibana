/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTab, EuiTabs } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { ExecutionStatus, isCancelableStatus, isTerminalStatus } from '@kbn/workflows';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { CancelExecutionButton } from './cancel_execution_button';
import { ResumeExecutionButton } from './resume_execution_button';
import { StepExecutionInlineBody } from './step_execution_inline_body';
import { WorkflowExecutionTopBar } from './workflow_execution_header';
import { WorkflowExecutionStepList } from './workflow_execution_step_list';
import { useWorkflowExecutionPolling } from '../../../entities/workflows/model/use_workflow_execution_polling';
import {
  HIGHLIGHTED_STEP_TRIGGER,
  setHighlightedStepId,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { JsonDataCode } from '../../../shared/ui/execution_data_viewer/json_data_code';
import { useChildWorkflowExecutions } from '../model/use_child_workflow_executions';
import { useStepExecution } from '../model/use_step_execution';

const PSEUDO_STEP_OVERVIEW = '__overview';
const PSEUDO_STEP_TRIGGER = 'trigger';

// Width threshold (px) at which the Table view switches from inline expansion
// to a two-column layout (step list on the left, step details on the right).
const SIDE_PANEL_BREAKPOINT_PX = 720;

type ExecutionViewTab = 'table' | 'tracers' | 'json';

const i18nTexts = {
  doneLabel: i18n.translate('workflowsManagement.executionDetail.done', {
    defaultMessage: 'Done',
  }),
  tracersComingSoon: i18n.translate('workflowsManagement.executionDetail.tracersComingSoon', {
    defaultMessage: 'Tracers view is coming soon.',
  }),
  tabTable: i18n.translate('workflowsManagement.executionDetail.tabTable', {
    defaultMessage: 'Table',
  }),
  tabTracers: i18n.translate('workflowsManagement.executionDetail.tabTracers', {
    defaultMessage: 'Tracers',
  }),
  tabJson: i18n.translate('workflowsManagement.executionDetail.tabJson', {
    defaultMessage: 'JSON',
  }),
  sidePanelEmpty: i18n.translate('workflowsManagement.executionDetail.sidePanelEmpty', {
    defaultMessage: 'Select a step to see its details.',
  }),
};

export interface WorkflowExecutionDetailProps {
  executionId: string;
  onClose: () => void;
}

function assignSelectedStepId(
  selectedStepExecutionId: string | undefined,
  executionIdToStepId: Map<string, string>
) {
  if (!selectedStepExecutionId || selectedStepExecutionId === PSEUDO_STEP_OVERVIEW) {
    return undefined;
  }
  if (selectedStepExecutionId === PSEUDO_STEP_TRIGGER) {
    return HIGHLIGHTED_STEP_TRIGGER;
  }
  return executionIdToStepId.get(selectedStepExecutionId);
}

export const WorkflowExecutionDetail: React.FC<WorkflowExecutionDetailProps> = React.memo(
  ({ executionId, onClose }) => {
    const styles = useMemoCss(componentStyles);
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const { workflowExecution, error } = useWorkflowExecutionPolling(executionId);

    const { activeTab, setSelectedStepExecution, selectedStepExecutionId, shouldAutoResume } =
      useWorkflowUrlState();
    const showBackButton = activeTab === 'executions';

    const [activeViewTab, setActiveViewTab] = useState<ExecutionViewTab>('table');

    const outerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    useEffect(() => {
      const node = outerRef.current;
      if (!node) return;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) setContainerWidth(entry.contentRect.width);
      });
      observer.observe(node);
      return () => observer.disconnect();
    }, []);
    const useSidePanel = containerWidth >= SIDE_PANEL_BREAKPOINT_PX && activeViewTab === 'table';

    // Clear cached step I/O data when switching to a different execution
    useEffect(() => {
      return () => {
        queryClient.removeQueries({ queryKey: ['stepExecution', executionId] });
      };
    }, [executionId, queryClient]);

    const expandedStepExecutionId = selectedStepExecutionId ?? null;

    const { childExecutions, isLoading: isLoadingChildExecutions } =
      useChildWorkflowExecutions(workflowExecution);

    // Step execution row id for the active waitForInput pause (polling uses includeInput: false)
    const waitingStepExecutionId = useMemo(() => {
      if (!workflowExecution || workflowExecution.status !== ExecutionStatus.WAITING_FOR_INPUT) {
        return undefined;
      }
      return workflowExecution.stepExecutions?.find(
        (s) => s.status === ExecutionStatus.WAITING_FOR_INPUT
      )?.id;
    }, [workflowExecution]);

    // Fetch the paused step's full data (with input) independently of the selected step
    const { data: pausedStepFullData } = useStepExecution(
      executionId,
      waitingStepExecutionId,
      ExecutionStatus.WAITING_FOR_INPUT
    );

    const { resumeMessage, resumeSchema } = useMemo<{
      resumeMessage: string | undefined;
      resumeSchema: JsonModelSchemaType | undefined;
    }>(() => {
      const stepInput = pausedStepFullData?.input as
        | { message?: string; schema?: JsonModelSchemaType }
        | undefined;
      return { resumeMessage: stepInput?.message, resumeSchema: stepInput?.schema };
    }, [pausedStepFullData]);

    const lightweightStep = useMemo(() => {
      if (!expandedStepExecutionId) return undefined;
      const direct = workflowExecution?.stepExecutions?.find(
        (s) => s.id === expandedStepExecutionId
      );
      if (direct) return direct;
      for (const childWorkflowExecution of childExecutions.values()) {
        const childStep = childWorkflowExecution.stepExecutions.find(
          (step) => step.id === expandedStepExecutionId
        );
        if (childStep) return childStep;
      }
      return undefined;
    }, [workflowExecution?.stepExecutions, expandedStepExecutionId, childExecutions]);

    const resolvedExecutionId = useMemo(() => {
      if (!expandedStepExecutionId) return executionId;
      for (const childWorkflowExecution of childExecutions.values()) {
        const childStep = childWorkflowExecution.stepExecutions.find(
          (step) => step.id === expandedStepExecutionId
        );
        if (childStep) return childWorkflowExecution.executionId;
      }
      return executionId;
    }, [executionId, expandedStepExecutionId, childExecutions]);

    const { data: fullStepData, isLoading: isLoadingStepData } = useStepExecution(
      resolvedExecutionId,
      expandedStepExecutionId ?? undefined,
      lightweightStep?.status
    );

    const expandedStepData = useMemo(() => {
      if (!lightweightStep) return undefined;
      if (fullStepData) {
        return { ...lightweightStep, input: fullStepData.input, output: fullStepData.output };
      }
      return lightweightStep;
    }, [lightweightStep, fullStepData]);

    const handleToggleStepExpansion = useCallback(
      (stepExecutionId: string) => {
        if (expandedStepExecutionId === stepExecutionId) {
          setSelectedStepExecution(null);
        } else {
          setSelectedStepExecution(stepExecutionId);
        }
      },
      [expandedStepExecutionId, setSelectedStepExecution]
    );

    // Stable map for redux highlight sync.
    const executionIdToStepId = useMemo(() => {
      const map = new Map<string, string>();
      for (const step of workflowExecution?.stepExecutions ?? []) {
        map.set(step.id, step.stepId);
      }
      return map;
    }, [workflowExecution?.stepExecutions]);

    useEffect(() => {
      dispatch(
        setHighlightedStepId({
          stepId: assignSelectedStepId(expandedStepExecutionId ?? undefined, executionIdToStepId),
        })
      );
    }, [expandedStepExecutionId, executionIdToStepId, dispatch]);

    useEffect(() => {
      return () => {
        dispatch(setHighlightedStepId({ stepId: undefined }));
      };
    }, [dispatch]);

    const showCancelButton = useMemo<boolean>(
      () => Boolean(workflowExecution && isCancelableStatus(workflowExecution.status)),
      [workflowExecution]
    );

    const showDoneButton = useMemo<boolean>(
      () =>
        Boolean(!showBackButton && workflowExecution && isTerminalStatus(workflowExecution.status)),
      [showBackButton, workflowExecution]
    );

    const tabs: Array<{ id: ExecutionViewTab; label: string }> = [
      { id: 'table', label: i18nTexts.tabTable },
      { id: 'tracers', label: i18nTexts.tabTracers },
      { id: 'json', label: i18nTexts.tabJson },
    ];

    return (
      <EuiPanel
        paddingSize="none"
        color="plain"
        hasShadow={false}
        css={styles.outer}
        panelRef={outerRef}
        data-test-subj="workflowExecutionDetail"
        data-execution-status={workflowExecution?.status}
      >
        <EuiFlexGroup direction="column" gutterSize="none" css={styles.column}>
          {/* Header + tabs anchored at the top in both modes so the step list
              keeps the same JSX position and React preserves its state across
              breakpoint changes. */}
          <EuiFlexItem grow={false}>
            <WorkflowExecutionTopBar showBackButton={showBackButton} onClose={onClose} />
            <div css={styles.tabsBar}>
              <EuiTabs size="s">
                {tabs.map((tab) => (
                  <EuiTab
                    key={tab.id}
                    isSelected={tab.id === activeViewTab}
                    onClick={() => setActiveViewTab(tab.id)}
                    data-test-subj={`workflowExecutionViewTab_${tab.id}`}
                  >
                    {tab.label}
                  </EuiTab>
                ))}
              </EuiTabs>
            </div>
          </EuiFlexItem>
          <EuiFlexItem
            css={useSidePanel ? styles.splitContainer : styles.scroll}
            data-test-subj={useSidePanel ? 'workflowExecutionDetailSidePanel' : undefined}
          >
            <div css={useSidePanel ? styles.leftCol : undefined}>
              {activeViewTab === 'table' && (
                <WorkflowExecutionStepList
                  execution={workflowExecution ?? null}
                  definition={workflowExecution?.workflowDefinition ?? null}
                  error={error}
                  expandedStepExecutionId={expandedStepExecutionId}
                  expandedStepData={expandedStepData}
                  isExpandedStepDataLoading={isLoadingStepData}
                  onToggleStepExpansion={handleToggleStepExpansion}
                  childExecutionsMap={childExecutions}
                  isLoadingChildExecutions={isLoadingChildExecutions}
                  useSidePanel={useSidePanel}
                />
              )}
              {activeViewTab === 'tracers' && (
                <div css={styles.placeholder}>{i18nTexts.tracersComingSoon}</div>
              )}
              {activeViewTab === 'json' && workflowExecution && (
                <div css={styles.jsonContainer}>
                  <JsonDataCode json={JSON.parse(JSON.stringify(workflowExecution))} />
                </div>
              )}
            </div>
            {useSidePanel && (
              <div css={styles.rightCol}>
                {expandedStepExecutionId ? (
                  <StepExecutionInlineBody
                    stepExecution={expandedStepData}
                    isLoading={isLoadingStepData}
                  />
                ) : (
                  <div css={styles.sidePanelEmpty}>{i18nTexts.sidePanelEmpty}</div>
                )}
              </div>
            )}
          </EuiFlexItem>

          {workflowExecution && workflowExecution.status === ExecutionStatus.WAITING_FOR_INPUT && (
            <EuiFlexItem grow={false}>
              <div css={styles.footer}>
                <ResumeExecutionButton
                  executionId={executionId}
                  resumeMessage={resumeMessage}
                  resumeSchema={resumeSchema}
                  autoOpen={shouldAutoResume}
                  waitingStepExecutionId={waitingStepExecutionId}
                />
              </div>
            </EuiFlexItem>
          )}

          {workflowExecution &&
            (showCancelButton || showDoneButton) &&
            workflowExecution.status !== ExecutionStatus.WAITING_FOR_INPUT && (
              <EuiFlexItem grow={false}>
                <div css={styles.footer}>
                  {showCancelButton ? (
                    <CancelExecutionButton
                      executionId={workflowExecution.id}
                      workflowId={workflowExecution.workflowId}
                      startedAt={workflowExecution.startedAt}
                    />
                  ) : null}
                  {showDoneButton ? (
                    <EuiButton onClick={onClose} iconType="check" size="s">
                      {i18nTexts.doneLabel}
                    </EuiButton>
                  ) : null}
                </div>
              </EuiFlexItem>
            )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
WorkflowExecutionDetail.displayName = 'WorkflowExecutionDetail';

const componentStyles = {
  outer: () =>
    css({
      height: '100%',
    }),
  column: () =>
    css({
      height: '100%',
    }),
  tabsBar: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingLeft: euiTheme.size.base,
      paddingRight: euiTheme.size.base,
      borderBottom: euiTheme.border.thin,
    }),
  scroll: () =>
    css({
      overflowY: 'auto',
      minHeight: 0,
    }),
  placeholder: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.xl,
      textAlign: 'center',
      color: euiTheme.colors.textSubdued,
    }),
  jsonContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.base,
      height: '100%',
    }),
  footer: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderTop: euiTheme.border.thin,
      padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
      display: 'flex',
      gap: euiTheme.size.s,
      justifyContent: 'flex-end',
    }),
  splitContainer: () =>
    css({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'stretch',
      minHeight: 0,
      overflow: 'hidden',
    }),
  leftCol: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '0 0 40%',
      minWidth: 0,
      borderRight: euiTheme.border.thin,
      overflowY: 'auto',
    }),
  rightCol: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '1 1 60%',
      minWidth: 0,
      padding: euiTheme.size.base,
      overflowY: 'auto',
    }),
  sidePanelEmpty: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.xl,
      textAlign: 'center',
      color: euiTheme.colors.textSubdued,
    }),
};
