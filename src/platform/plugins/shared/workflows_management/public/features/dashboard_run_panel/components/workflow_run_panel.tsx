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
import React, { useCallback, useMemo, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { FetchContext } from '@kbn/presentation-publishing';
import { apiPublishesSavedObjectId } from '@kbn/presentation-publishing';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import { getWorkflowsCapabilities, RunWorkflowInputsModal } from '@kbn/workflows-ui';
import { LastRunStatus, PanelStatusCallout } from './panel_status';
import { RunNotice } from './run_notice';
import { WorkflowGraphBackground } from './workflow_graph_background';
import { PLUGIN_ID } from '../../../../common';
import type {
  WorkflowRunGraphLayout,
  WorkflowRunInputMapping,
} from '../../../../server/dashboard_run_panel/schema';
import {
  isNotFoundError,
  useExecutionWithSteps,
  useLastExecutionId,
  useRunWorkflowFromPanel,
  useWorkflowApi,
  useWorkflowDetail,
} from '../hooks/use_workflow_run_panel_queries';
import { getDashboardControls } from '../lib/dashboard_controls';
import { describeWorkflowInputs } from '../lib/describe_workflow_inputs';
import type { WorkflowRunPanelStatus } from '../lib/get_panel_status';
import { getPanelStatus } from '../lib/get_panel_status';
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
  fetchContext: FetchContext;
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

const isStartedRunActive = (
  startedExecutionId: string | undefined,
  shownRun: Pick<WorkflowExecutionDto, 'id' | 'status'> | undefined
): boolean =>
  startedExecutionId !== undefined &&
  !(shownRun?.id === startedExecutionId && TerminalExecutionStatuses.includes(shownRun.status));

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

interface RunPanelFooterProps {
  lastRun: React.ReactNode;
  buttonLabel: string | undefined;
  isBlocked: boolean;
  isBusy: boolean;
  onRun: () => void;
}

const RunPanelFooter = ({
  lastRun,
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
    </EuiFlexGroup>
  );
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
  fetchContext,
}: WorkflowRunPanelProps): React.JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const api = useWorkflowApi(core.http);
  const capabilities = useMemo(
    () => getWorkflowsCapabilities(core.application.capabilities),
    [core.application.capabilities]
  );

  const workflowQuery = useWorkflowDetail(api, workflowId);
  const status = getPanelStatus({
    capabilities,
    workflow: workflowQuery.data,
    isLoading: workflowQuery.isLoading,
    error: workflowQuery.error,
    isNotFound: isNotFoundError(workflowQuery.error),
  });
  const canQuery = status.type !== 'missing_privileges' && status.type !== 'not_found';
  const lastRunIdQuery = useLastExecutionId(
    api,
    workflowId,
    canQuery && Boolean(workflowQuery.data)
  );
  const lastRun = useExecutionWithSteps(api, lastRunIdQuery.data ?? undefined);

  const [startedExecutionId, setStartedExecutionId] = useState<string>();

  const runMutation = useRunWorkflowFromPanel(api, workflowId);
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
        path: `/${workflowId}?executionId=${executionId}`,
      }),
    [core.application, workflowId]
  );

  const run = (runInputs: Record<string, unknown>) => {
    if (!workflow || runMutation.isLoading) return;
    runMutation.mutate(
      { inputs: runInputs, metadata: getRunMetadata(uuid, parentApi) },
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
          <LastRunStatus
            run={lastRun.data}
            isLoading={lastRunIdQuery.isLoading || lastRun.isInitialLoading}
            getHref={executionHref}
          />
        }
        buttonLabel={buttonLabel}
        isBlocked={Boolean(blockedReason)}
        isBusy={runMutation.isLoading || isStartedRunActive(startedExecutionId, lastRun.data)}
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
