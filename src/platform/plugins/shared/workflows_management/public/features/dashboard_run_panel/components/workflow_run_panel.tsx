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
import { TerminalExecutionStatuses } from '@kbn/workflows';
import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import { getWorkflowsCapabilities } from '@kbn/workflows-ui';
import { LastRunLine, PanelStatusCallout } from './panel_status';
import { RunConfirmModal } from './run_confirm_modal';
import { PLUGIN_ID } from '../../../../common';
import type { WorkflowRunInputMapping } from '../../../../server/dashboard_run_panel/schema';
import {
  isNotFoundError,
  useLastExecution,
  useOwnExecution,
  useRunWorkflowFromPanel,
  useWorkflowApi,
  useWorkflowDetail,
} from '../hooks/use_workflow_run_panel_queries';
import { getDashboardControls } from '../lib/dashboard_controls';
import { describeWorkflowInputs } from '../lib/describe_workflow_inputs';
import type { WorkflowRunPanelStatus } from '../lib/get_panel_status';
import { getPanelStatus } from '../lib/get_panel_status';
import type {
  DashboardControlSnapshot,
  ResolvedWorkflowInputs,
} from '../lib/resolve_workflow_inputs';
import { resolveWorkflowInputs } from '../lib/resolve_workflow_inputs';
import { DEFAULT_BUTTON_LABEL, RUN_MESSAGES, STATUS_MESSAGES } from '../translations';

export interface WorkflowRunPanelProps {
  core: CoreStart;
  uuid: string;
  parentApi: unknown;
  workflowId: string;
  buttonLabel: string | undefined;
  mappings: readonly WorkflowRunInputMapping[];
  fetchContext: FetchContext;
}

interface PendingRun {
  resolved: ResolvedWorkflowInputs;
  controls: DashboardControlSnapshot[];
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

export const WorkflowRunPanel = ({
  core,
  uuid,
  parentApi,
  workflowId,
  buttonLabel,
  mappings,
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
  const lastRunQuery = useLastExecution(api, workflowId, canQuery && Boolean(workflowQuery.data));

  const [ownExecutionId, setOwnExecutionId] = useState<string>();
  const ownExecution = useOwnExecution(api, ownExecutionId);
  const isOwnRunActive =
    Boolean(ownExecutionId) &&
    !(ownExecution.data && TerminalExecutionStatuses.includes(ownExecution.data.status));

  const runMutation = useRunWorkflowFromPanel(api, workflowId);
  const [pendingRun, setPendingRun] = useState<PendingRun>();

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

  const openConfirm = () => {
    const controls = getDashboardControls(parentApi);
    const resolved = resolveWorkflowInputs(
      descriptors,
      mappings,
      {
        timeRange: getEffectiveTimeRange(fetchContext),
        query: fetchContext.query,
        filters: fetchContext.filters ?? [],
        controls,
      },
      { now: new Date(), esQueryConfig: getEsQueryConfig(core.uiSettings) }
    );
    setPendingRun({ resolved, controls });
  };

  const run = (runInputs: Record<string, unknown>) => {
    if (!workflow || runMutation.isLoading) return;
    const dashboardId = apiPublishesSavedObjectId(parentApi)
      ? parentApi.savedObjectId$.value
      : undefined;
    runMutation.mutate(
      {
        inputs: runInputs,
        metadata: {
          source: 'dashboard',
          panelId: uuid,
          ...(dashboardId ? { dashboardId } : {}),
        },
      },
      {
        onSuccess: ({ workflowExecutionId }) => {
          setPendingRun(undefined);
          setOwnExecutionId(workflowExecutionId);
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
          core.notifications.toasts.addError(
            error instanceof Error ? error : new Error(String(error)),
            { title: RUN_MESSAGES.runFailedToastTitle(workflow.name) }
          );
        },
      }
    );
  };

  const containerCss = css`
    height: 100%;
    padding: ${euiTheme.size.s};
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
    <EuiFlexGroup
      css={containerCss}
      direction="column"
      gutterSize="s"
      justifyContent="center"
      data-test-subj="workflowRunPanel"
    >
      {blockedReason && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="workflowRunPanelBlocked">
            {blockedReason}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          iconType="play"
          onClick={openConfirm}
          isDisabled={Boolean(blockedReason) || isOwnRunActive}
          isLoading={runMutation.isLoading || isOwnRunActive}
          data-test-subj="workflowRunPanelButton"
        >
          {buttonLabel || DEFAULT_BUTTON_LABEL}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <LastRunLine
          run={ownExecution.data ?? lastRunQuery.data ?? undefined}
          isOwnRun={Boolean(ownExecution.data)}
          isLoading={lastRunQuery.isLoading}
          getHref={executionHref}
        />
      </EuiFlexItem>

      {pendingRun && workflow && (
        <RunConfirmModal
          workflowName={workflow.name}
          inputs={inputs}
          descriptors={descriptors}
          mappings={mappings}
          resolved={pendingRun.resolved}
          controls={pendingRun.controls}
          isRunning={runMutation.isLoading}
          onCancel={() => setPendingRun(undefined)}
          onConfirm={run}
        />
      )}
    </EuiFlexGroup>
  );
};
