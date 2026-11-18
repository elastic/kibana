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
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { FetchContext } from '@kbn/presentation-publishing';
import { apiPublishesSavedObjectId } from '@kbn/presentation-publishing';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import { RunWorkflowInputsModal, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { LastRunStatus, PanelStatusCallout } from './panel_status';
import { RunNotice } from './run_notice';
import { WorkflowGraphBackground } from './workflow_graph_background';
import { PLUGIN_ID } from '../../../../common';
import type {
  WorkflowRunGraphLayout,
  WorkflowRunInputMapping,
} from '../../../../server/dashboard_run_panel/schema';
import {
  isExecutionInProgress,
  useExecutionWithSteps,
  useLastExecutionId,
  useRefetchOnReload,
  useRunWorkflowFromPanel,
  useWorkflowDetail,
} from '../hooks/use_workflow_run_panel_queries';
import { getDashboardControls } from '../lib/dashboard_controls';
import { describeWorkflowInputs } from '../lib/describe_workflow_inputs';
import type { WorkflowRunPanelStatus } from '../lib/get_panel_status';
import { getPanelStatus } from '../lib/get_panel_status';
import { getErrorMessage, isNotFoundError } from '../lib/http_errors';
import type { ResolvedWorkflowInputs } from '../lib/resolve_workflow_inputs';
import { resolveWorkflowInputs } from '../lib/resolve_workflow_inputs';
import { DEFAULT_BUTTON_LABEL, RUN_MESSAGES, STATUS_MESSAGES } from '../translations';

export interface WorkflowRunPanelProps {
  core: CoreStart;
  uuid: string;
  parentApi: unknown;
  workflowId: string;
  buttonLabel: string | undefined;
  mappings: readonly WorkflowRunInputMapping[];
  graphLayout: WorkflowRunGraphLayout | undefined;
  /** Keeps an `auto` graph in its current direction, e.g. while a dashboard flyout narrows the panel. */
  holdGraphDirection: boolean;
  /** False when the dashboard is shown read-only, e.g. printed or embedded as a preview. */
  isInteractive: boolean;
  fetchContext: FetchContext;
  /** Called with the workflow's name once it loads, so the panel can be titled after it. */
  onWorkflowNameChange: (name: string | undefined) => void;
  onDataLoadingChange: (isLoading: boolean) => void;
}

const BLOCKED_REASONS: Partial<Record<WorkflowRunPanelStatus['type'], string>> = {
  not_runnable_by_user: STATUS_MESSAGES.notRunnableByUser,
  disabled: STATUS_MESSAGES.disabled,
  invalid: STATUS_MESSAGES.invalid,
  no_manual_trigger: STATUS_MESSAGES.noManualTrigger,
};

const getEffectiveTimeRange = ({ timeRange, timeslice }: FetchContext): TimeRange | undefined =>
  timeslice
    ? { from: new Date(timeslice[0]).toISOString(), to: new Date(timeslice[1]).toISOString() }
    : timeRange;

const getRunMetadata = (panelId: string, parentApi: unknown): Record<string, string> => {
  const dashboardId = apiPublishesSavedObjectId(parentApi)
    ? parentApi.savedObjectId$.value
    : undefined;
  return { source: 'dashboard', panelId, ...(dashboardId ? { dashboardId } : {}) };
};

/** Whether the run this panel started is the one it shows and is still starting or executing. */
const isStartedRunActive = (
  startedExecutionId: string | undefined,
  shownRunId: string | null | undefined,
  shownRun: Pick<WorkflowExecutionDto, 'id' | 'status'> | undefined
): boolean => {
  if (startedExecutionId === undefined || shownRunId !== startedExecutionId) return false;
  return shownRun?.id !== startedExecutionId || isExecutionInProgress(shownRun.status);
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

interface RunPanelFooterProps {
  lastRun: React.ReactNode;
  isInteractive: boolean;
  buttonLabel: string | undefined;
  isBlocked: boolean;
  isBusy: boolean;
  onRun: () => void;
}

const RunPanelFooter = ({
  lastRun,
  isInteractive,
  buttonLabel,
  isBlocked,
  isBusy,
  onRun,
}: RunPanelFooterProps): React.JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const footerCss = css`
    flex-grow: 0;
    padding: ${euiTheme.size.s};
    background: ${euiTheme.colors.backgroundBasePlain};
    border-top: ${euiTheme.border.thin};
  `;
  return (
    <EuiFlexGroup
      css={footerCss}
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
      wrap={false}
    >
      <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
        {lastRun}
      </EuiFlexItem>
      {isInteractive && (
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            size="s"
            iconType="play"
            onClick={onRun}
            isDisabled={isBlocked || isBusy}
            isLoading={isBusy}
            data-test-subj="workflowRunPanelButton"
          >
            {isBusy ? RUN_MESSAGES.running : buttonLabel || DEFAULT_BUTTON_LABEL}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

type RunPanelDataParams = Pick<
  WorkflowRunPanelProps,
  'workflowId' | 'fetchContext' | 'onWorkflowNameChange' | 'onDataLoadingChange'
>;

/** Loads the workflow and its last run, and reports the panel's title and loading state. */
const useRunPanelData = ({
  workflowId,
  fetchContext,
  onWorkflowNameChange,
  onDataLoadingChange,
}: RunPanelDataParams) => {
  const capabilities = useWorkflowsCapabilities();
  const workflowQuery = useWorkflowDetail(workflowId);
  const workflowName = workflowQuery.data?.name;
  useEffect(() => onWorkflowNameChange(workflowName), [onWorkflowNameChange, workflowName]);
  const status = getPanelStatus({
    capabilities,
    workflow: workflowQuery.data,
    isLoading: workflowQuery.isLoading,
    error: workflowQuery.error,
    isNotFound: isNotFoundError(workflowQuery.error),
  });
  const canQuery = status.type !== 'missing_privileges' && status.type !== 'not_found';
  const lastRunIdQuery = useLastExecutionId(workflowId, canQuery && Boolean(workflowQuery.data));
  const lastRun = useExecutionWithSteps(lastRunIdQuery.data ?? undefined);
  useRefetchOnReload(fetchContext, workflowId);

  const isLastRunLoading = lastRunIdQuery.isInitialLoading || lastRun.isInitialLoading;
  const isDataLoading = workflowQuery.isInitialLoading || isLastRunLoading;
  useEffect(() => onDataLoadingChange(isDataLoading), [onDataLoadingChange, isDataLoading]);

  return { status, lastRunIdQuery, lastRun, isLastRunLoading };
};

export const WorkflowRunPanel = ({
  core,
  uuid,
  parentApi,
  workflowId,
  buttonLabel,
  mappings,
  graphLayout,
  holdGraphDirection,
  isInteractive,
  fetchContext,
  onWorkflowNameChange,
  onDataLoadingChange,
}: WorkflowRunPanelProps): React.JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const { status, lastRunIdQuery, lastRun, isLastRunLoading } = useRunPanelData({
    workflowId,
    fetchContext,
    onWorkflowNameChange,
    onDataLoadingChange,
  });

  const [startedExecutionId, setStartedExecutionId] = useState<string>();

  const runMutation = useRunWorkflowFromPanel();
  const [pendingRun, setPendingRun] = useState<ResolvedWorkflowInputs>();

  const workflow = 'workflow' in status ? status.workflow : undefined;
  const inputs = useMemo(
    () => getInputsFromDefinition(workflow?.definition ?? undefined),
    [workflow?.definition]
  );
  const descriptors = useMemo(() => describeWorkflowInputs(inputs), [inputs]);

  const executionHref = useCallback(
    (executionId: string) =>
      core.application.getUrlForApp(PLUGIN_ID, {
        path: `/${encodeURIComponent(workflowId)}?executionId=${encodeURIComponent(executionId)}`,
      }),
    [core.application, workflowId]
  );

  const run = (runInputs: Record<string, unknown>) => {
    if (!workflow || runMutation.isLoading) return;
    runMutation.mutate(
      { id: workflowId, inputs: runInputs, metadata: getRunMetadata(uuid, parentApi) },
      {
        onSuccess: ({ workflowExecutionId }) => {
          setPendingRun(undefined);
          setStartedExecutionId(workflowExecutionId);
          core.notifications.toasts.addSuccess({
            title: RUN_MESSAGES.startedToastTitle(workflow.name),
            actionProps: {
              primary: {
                children: RUN_MESSAGES.viewExecution,
                onClick: () => core.application.navigateToUrl(executionHref(workflowExecutionId)),
              },
            },
          });
        },
        onError: (error) => {
          core.notifications.toasts.addError(toError(error), {
            title: RUN_MESSAGES.runFailedToastTitle(workflow.name),
            toastMessage: getErrorMessage(error),
          });
        },
      }
    );
  };

  const onRunClick = () => {
    if (!inputs || descriptors.length === 0) {
      run({});
      return;
    }
    setPendingRun(
      resolveWorkflowInputs(
        descriptors,
        mappings,
        {
          timeRange: getEffectiveTimeRange(fetchContext),
          query: fetchContext.query,
          filters: fetchContext.filters ?? [],
          controls: getDashboardControls(parentApi),
        },
        { now: new Date(), esQueryConfig: getEsQueryConfig(core.uiSettings) }
      )
    );
  };

  const containerCss = css`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
  `;
  const graphAreaCss = css`
    position: relative;
    flex: 1;
    min-height: 0;
  `;
  const blockedCss = css`
    position: absolute;
    inset-inline: 0;
    top: 0;
    padding: ${euiTheme.size.s};
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  if (status.type === 'loading') {
    return (
      <EuiFlexGroup css={containerCss} alignItems="center" justifyContent="center">
        <EuiLoadingSpinner size="l" />
      </EuiFlexGroup>
    );
  }

  if (
    status.type === 'missing_privileges' ||
    status.type === 'not_found' ||
    status.type === 'load_failed'
  ) {
    return <PanelStatusCallout status={status} />;
  }

  const blockedReason = BLOCKED_REASONS[status.type];

  return (
    <div css={containerCss} data-test-subj="workflowRunPanel">
      <div css={graphAreaCss}>
        {workflow?.definition && (
          <WorkflowGraphBackground
            workflow={workflow.definition}
            isYamlValid={workflow.valid}
            stepExecutions={lastRun.data?.stepExecutions}
            layout={graphLayout}
            holdDirection={holdGraphDirection}
          />
        )}
        {blockedReason && (
          <EuiText
            size="xs"
            color="subdued"
            css={blockedCss}
            data-test-subj="workflowRunPanelBlocked"
          >
            {blockedReason}
          </EuiText>
        )}
      </div>
      <RunPanelFooter
        lastRun={
          <LastRunStatus run={lastRun.data} isLoading={isLastRunLoading} getHref={executionHref} />
        }
        isInteractive={isInteractive}
        buttonLabel={buttonLabel}
        isBlocked={Boolean(blockedReason)}
        isBusy={
          runMutation.isLoading ||
          isStartedRunActive(startedExecutionId, lastRunIdQuery.data, lastRun.data)
        }
        onRun={onRunClick}
      />

      {pendingRun && workflow && inputs && (
        <RunWorkflowInputsModal
          workflowName={workflow.name}
          inputs={inputs}
          initialValues={pendingRun.values}
          notice={<RunNotice descriptors={descriptors} resolved={pendingRun} />}
          onSubmit={run}
          onCancel={() => setPendingRun(undefined)}
        />
      )}
    </div>
  );
};
