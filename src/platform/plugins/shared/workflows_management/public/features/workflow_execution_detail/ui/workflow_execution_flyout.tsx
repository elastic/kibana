/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTab,
  EuiTabs,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ExecutionFlyoutTitle } from './execution_flyout_title';
import { ExecutionResultCard } from './execution_result_card';
import { ExecutionRunTags } from './execution_run_tags';
import { ExecutionTakeActionSplitButton } from './execution_take_action_split_button';
import { ResumeExecutionButton } from './resume_execution_button';
import { ResumeUnavailableCallout } from './resume_unavailable_callout';
import { STEP_DETAIL_WIDTH, StepDetailPanel } from './step_detail_panel';
import { StepExecutionsTruncatedCallout } from './step_executions_truncated_callout';
import { WorkflowStepExecutionTree } from './workflow_step_execution_tree';
import { useWorkflowExecutionPolling } from '../../../entities/workflows/model/use_workflow_execution_polling';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { JSONCodeEditorCommonMemoized } from '../../../shared/ui/execution_data_viewer/json_editor_common';
import { useChildWorkflowExecutions } from '../model/use_child_workflow_executions';
import { useExecutionFlyoutActions } from '../model/use_execution_flyout_actions';
import type { FlyoutTabId } from '../model/use_execution_flyout_view';
import { useExecutionFlyoutView } from '../model/use_execution_flyout_view';
import { useFailedStepFocus } from '../model/use_failed_step_focus';
import { useResumeSubmitState } from '../model/use_resume_submit_state';
import { useWaitingStepResume } from '../model/use_waiting_step_resume';

export interface WorkflowExecutionFlyoutProps {
  executionId: string;
  /** Optional; falls back to the loaded execution / definition name. */
  workflowName?: string;
  /** Optional; falls back to tags on the workflow definition when present. */
  workflowTags?: string[];
  onClose: () => void;
}

const i18nTexts = {
  back: i18n.translate('workflows.executionFlyout.back', { defaultMessage: 'Back' }),
  tableTab: i18n.translate('workflows.executionFlyout.tableTab', { defaultMessage: 'Table' }),
  jsonTab: i18n.translate('workflows.executionFlyout.jsonTab', { defaultMessage: 'JSON' }),
  share: i18n.translate('workflows.executionFlyout.share', { defaultMessage: 'Share' }),
  close: i18n.translate('workflows.executionFlyout.close', { defaultMessage: 'Close' }),
};

const FLYOUT_CLASSNAME = 'workflowExecutionFlyout';
/** Keep slim enough that the YAML editor stays readable with both panels open. */
const EXECUTION_PANEL_WIDTH = 560;

export const WorkflowExecutionFlyout = React.memo<WorkflowExecutionFlyoutProps>(
  ({ executionId, workflowName: workflowNameProp, workflowTags: workflowTagsProp, onClose }) => {
    const { euiTheme } = useEuiTheme();
    const [activeTab, setActiveTab] = useState<FlyoutTabId>('table');
    const {
      selectedStepExecutionId: urlSelectedStepExecutionId,
      setSelectedStepExecution,
      shouldAutoResume,
    } = useWorkflowUrlState();
    const selectedStepExecutionId = urlSelectedStepExecutionId ?? null;
    const setSelectedStepExecutionId = useCallback(
      (stepExecutionId: string | null) => {
        setSelectedStepExecution(stepExecutionId);
      },
      [setSelectedStepExecution]
    );
    const { workflowExecution, error } = useWorkflowExecutionPolling(executionId);
    const {
      waitingStepExecutionId,
      waitingStepStartedAt,
      resumeMessage,
      resumeSchema,
      approvalLabels,
      hasResumeError,
      retryResume,
    } = useWaitingStepResume(executionId, workflowExecution);
    const resumeSubmitState = useResumeSubmitState(executionId, waitingStepExecutionId);

    const {
      workflowName,
      workflowTags,
      stepExecutionsTotal,
      showStepExecutionTree,
      executionJson,
    } = useExecutionFlyoutView({
      activeTab,
      error,
      workflowExecution,
      workflowNameProp,
      workflowTagsProp,
    });

    const workflowDefinition = workflowExecution?.workflowDefinition ?? null;

    const showStepsTab = useCallback(() => setActiveTab('table'), []);
    const { failedPosition, autoExpandErrorForStepId, errorArrivalPulseStepId, focusFailedStep } =
      useFailedStepFocus({
        workflowExecution,
        showStepsTab,
        selectStepExecution: setSelectedStepExecutionId,
      });

    const { handleShare, handleOpenFailedStepInEditor } = useExecutionFlyoutActions({
      executionId,
      workflowExecution,
      selectedStepExecutionId,
    });

    const { childExecutions, isLoading: isLoadingChildExecutions } =
      useChildWorkflowExecutions(workflowExecution);

    // Widen the flyout when the step detail panel is open (FlyoutPanels pattern).
    // Width is a hard constant — content must not flex the panels. It must go through the flyout's
    // own `size` prop: an imperative style write loses to EUI's container-relative `inline-size`,
    // which lands on the first commit (the EuiFlyout `container` component default).
    const flyoutWidth = selectedStepExecutionId
      ? EXECUTION_PANEL_WIDTH + STEP_DETAIL_WIDTH
      : EXECUTION_PANEL_WIDTH;

    return (
      <EuiFlyout
        aria-label={i18n.translate('workflows.executionFlyout.ariaLabel', {
          defaultMessage: 'Execution of {name}',
          values: { name: workflowName },
        })}
        onClose={onClose}
        type="push"
        size={flyoutWidth}
        paddingSize="none"
        hideCloseButton
        className={FLYOUT_CLASSNAME}
        data-test-subj="workflowExecutionFlyout"
      >
        {/* Outer flex row — each column is a visually independent panel */}
        <div css={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
          {/* ── Step detail panel (independent header + scrollable body) ── */}
          {selectedStepExecutionId && (
            <StepDetailPanel
              selectedStepExecutionId={selectedStepExecutionId}
              executionId={executionId}
              workflowExecution={workflowExecution}
              childExecutions={childExecutions}
              onSelectStep={setSelectedStepExecutionId}
            />
          )}

          {/* ── Execution panel (own EuiFlyoutHeader / Body / Footer) ── */}
          <div
            css={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <EuiFlyoutHeader css={{ padding: 0 }}>
              <EuiFlexGroup
                justifyContent="spaceBetween"
                alignItems="center"
                gutterSize="xs"
                responsive={false}
                css={{
                  // AppHeader compact: 8px padding + 32px size="s" control = 48px.
                  boxSizing: 'border-box',
                  minHeight: 48,
                  paddingBlock: euiTheme.size.s,
                  paddingInline: euiTheme.size.s,
                  borderBottom: euiTheme.border.thin,
                }}
              >
                <EuiButtonEmpty
                  size="s"
                  iconType="undo"
                  color="text"
                  flush="left"
                  onClick={onClose}
                  data-test-subj="workflowBackToExecutionsLink"
                >
                  {i18nTexts.back}
                </EuiButtonEmpty>
                <EuiFlexGroup
                  gutterSize="xs"
                  alignItems="center"
                  justifyContent="flexEnd"
                  responsive={false}
                >
                  <EuiToolTip content={i18nTexts.share} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="share"
                      aria-label={i18nTexts.share}
                      color="text"
                      size="s"
                      iconSize="m"
                      onClick={handleShare}
                      isDisabled={!workflowExecution?.workflowId}
                      data-test-subj="workflowExecutionFlyoutShare"
                    />
                  </EuiToolTip>
                  <EuiToolTip content={i18nTexts.close} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="cross"
                      aria-label={i18nTexts.close}
                      color="text"
                      size="s"
                      iconSize="m"
                      onClick={onClose}
                    />
                  </EuiToolTip>
                </EuiFlexGroup>
              </EuiFlexGroup>

              <div
                css={{
                  padding: '16px 16px 8px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <ExecutionFlyoutTitle
                  workflowName={workflowName}
                  startedAtIso={workflowExecution?.startedAt}
                />

                <ExecutionRunTags
                  workflowExecution={workflowExecution}
                  workflowTags={workflowTags}
                />

                {workflowExecution ? (
                  <ExecutionResultCard
                    workflowExecution={workflowExecution}
                    failedPosition={failedPosition}
                    onFocusFailedStep={focusFailedStep}
                  />
                ) : (
                  <EuiLoadingSpinner size="m" />
                )}

                {waitingStepExecutionId && workflowExecution && (
                  <ResumeExecutionButton
                    executionId={executionId}
                    workflowId={workflowExecution.workflowId}
                    stepStartedAt={waitingStepStartedAt}
                    resumeMessage={resumeMessage}
                    resumeSchema={resumeSchema}
                    approvalLabels={approvalLabels}
                    autoOpen={shouldAutoResume}
                    waitingStepExecutionId={waitingStepExecutionId}
                    submitState={resumeSubmitState}
                  />
                )}
                {hasResumeError && <ResumeUnavailableCallout onRetry={retryResume} />}
              </div>
            </EuiFlyoutHeader>

            <EuiFlyoutBody
              css={css`
                .euiFlyoutBody__overflowContent {
                  padding: 0;
                }
              `}
            >
              {!workflowExecution && !error ? (
                <EuiFlexGroup
                  justifyContent="center"
                  css={{ padding: `${euiTheme.size.xl} ${euiTheme.size.base} 0` }}
                >
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="l" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <>
                  <EuiTabs css={{ paddingInline: euiTheme.size.base }}>
                    <EuiTab
                      isSelected={activeTab === 'table'}
                      onClick={() => setActiveTab('table')}
                    >
                      {i18nTexts.tableTab}
                    </EuiTab>
                    <EuiTab isSelected={activeTab === 'json'} onClick={() => setActiveTab('json')}>
                      {i18nTexts.jsonTab}
                    </EuiTab>
                  </EuiTabs>
                  {/*
                    No Table-tab step search: findability is auto-scroll, the header
                    failure link, and iteration pins. If step search returns, spec
                    expand-on-match and match handling inside collapsed gaps/attempts
                    first — naive filter breaks the pin/gap model. (Subflyout
                    Input/Output field/value search is separate and required.)
                  */}
                  <div
                    css={{
                      padding: `${euiTheme.size.s} ${euiTheme.size.base} ${euiTheme.size.base}`,
                    }}
                  >
                    {/* Both tabs show the same paginated run, so the callout is outside the Table branch. */}
                    <StepExecutionsTruncatedCallout
                      executionId={executionId}
                      loadedCount={workflowExecution?.stepExecutions.length ?? 0}
                    />
                    {showStepExecutionTree && (
                      <WorkflowStepExecutionTree
                        definition={workflowDefinition}
                        execution={workflowExecution ?? null}
                        stepExecutionsTotal={stepExecutionsTotal}
                        error={error}
                        onStepExecutionClick={setSelectedStepExecutionId}
                        selectedId={selectedStepExecutionId}
                        childExecutionsMap={childExecutions}
                        isLoadingChildExecutions={isLoadingChildExecutions}
                        autoExpandErrorForStepId={autoExpandErrorForStepId}
                        errorArrivalPulseStepId={errorArrivalPulseStepId}
                        workflowName={workflowName}
                        onBeforeDiagnose={() => setSelectedStepExecutionId(null)}
                      />
                    )}
                    {!showStepExecutionTree && (
                      <div css={{ height: '70vh' }}>
                        <JSONCodeEditorCommonMemoized
                          data-test-subj="workflowExecutionJsonEditor"
                          jsonValue={executionJson}
                          onEditorDidMount={() => {}}
                          height="100%"
                          hasLineNumbers
                          enableFindAction
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </EuiFlyoutBody>

            <EuiFlyoutFooter>
              <div css={{ padding: `${euiTheme.size.m} ${euiTheme.size.base}` }}>
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
                  <EuiFlexItem grow={false}>
                    {workflowExecution && (
                      <ExecutionTakeActionSplitButton
                        execution={workflowExecution}
                        failedStepId={failedPosition?.step.stepId}
                        onOpenFailedStepInEditor={handleOpenFailedStepInEditor}
                      />
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </EuiFlyoutFooter>
          </div>
        </div>
      </EuiFlyout>
    );
  }
);
WorkflowExecutionFlyout.displayName = 'WorkflowExecutionFlyout';
