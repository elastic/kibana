/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';

import { EuiButton, EuiFlexGroup, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import type { ApplicationStart, NotificationsStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { RunWorkflowResponseDto } from '@kbn/workflows';
import {
  getManagedWorkflowSelectorVisibilityContext,
  getManagedWorkflowSolutionVisibilityContext,
} from '@kbn/workflows';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { ToMountPointParams } from '@kbn/react-kibana-mount';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import { useRunWorkflow } from '../../hooks/use_run_workflow';
import { useWorkflows } from '../../hooks/use_workflows';
import { useWorkflowsCapabilities } from '../../hooks/use_workflows_capabilities';
import { WorkflowSelector } from '../workflow_selector/workflow_selector';
import type { WorkflowSelectorVisibility } from '../workflow_selector/workflow_utils';
import * as i18n from './translations';
import { requiresUserSuppliedInputs } from './run_workflow_panel_helpers';
import { RunWorkflowInputsModal } from './run_workflow_inputs_modal';

export interface RunWorkflowPanelProps {
  /** The inputs payload to pass when executing the workflow. */
  inputs: Record<string, unknown>;
  /**
   * The trigger type(s) to sort to the top of the workflow list.
   * Workflows whose triggers include any of these types are ranked first.
   */
  sortTriggerTypes: string | readonly string[];
  /** data-test-subj prefix for the execute button. */
  executeButtonTestSubj: string;
  /**
   * When provided, only workflows carrying at least one of these tags are shown.
   * An empty array (or undefined) disables the filter — all enabled workflows appear.
   */
  tags?: string[];
  /**
   * Managed workflows are excluded from the list unless the caller opts in with a matching
   * visibility. Pass the selector(s)/solution(s) the surfacing context maps to (e.g.
   * `{ selectors: ['rule_action'] }`) to include managed workflows tagged with that context.
   */
  visibility?: WorkflowSelectorVisibility;
  onClose: () => void;
  /** Optional callback invoked when workflow execution is triggered. */
  onExecute?: () => void;
}

interface RunWorkflowPanelServices {
  application: ApplicationStart;
  notifications: NotificationsStart;
  rendering: ToMountPointParams;
}

/** A shared panel that lets users select and execute a workflow with arbitrary inputs. */
export const RunWorkflowPanel = ({
  inputs,
  sortTriggerTypes,
  executeButtonTestSubj,
  tags,
  visibility,
  onClose,
  onExecute,
}: RunWorkflowPanelProps) => {
  const {
    services: { application, notifications, rendering },
  } = useKibana<RunWorkflowPanelServices>();
  const { euiTheme } = useEuiTheme();

  const runWorkflow = useRunWorkflow();
  const [selectedId, setSelectedId] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isInputsModalOpen, setIsInputsModalOpen] = React.useState<boolean>(false);

  const { canReadManagedWorkflow } = useWorkflowsCapabilities();
  // Mirror the visibility-context derivation WorkflowSelector runs internally so both queries share
  // a react-query cache key (one fetch) and the selected managed workflow resolves below.
  const visibilityContext = useMemo(() => {
    if (!visibility) return undefined;
    const contexts = [
      ...(visibility.selectors ?? []).map(getManagedWorkflowSelectorVisibilityContext),
      ...(visibility.solutions ?? []).map(getManagedWorkflowSolutionVisibilityContext),
    ];
    return contexts.length > 0 ? contexts : undefined;
  }, [visibility]);

  // Share the query key with WorkflowSelector so this is a cache hit — no extra fetch.
  const { data: workflowsData } = useWorkflows({
    size: 1000,
    page: 1,
    query: '',
    ...(visibilityContext && canReadManagedWorkflow
      ? { managed: 'all' as const, visibilityContext }
      : {}),
  });
  const selectedWorkflow = useMemo(
    () => workflowsData?.results.find((w) => w.id === selectedId),
    [workflowsData, selectedId]
  );
  const normalizedInputs = useMemo(
    () => (selectedWorkflow ? getInputsFromDefinition(selectedWorkflow.definition) : undefined),
    [selectedWorkflow]
  );
  const needsManualInputs = useMemo(
    () => requiresUserSuppliedInputs(normalizedInputs),
    [normalizedInputs]
  );

  const triggerTypes = useMemo(
    () => (Array.isArray(sortTriggerTypes) ? sortTriggerTypes : [sortTriggerTypes]),
    [sortTriggerTypes]
  );

  const executeWorkflow = useCallback(
    (extraInputs: Record<string, unknown>) => {
      if (!selectedId) return;
      setIsLoading(true);
      onExecute?.();

      runWorkflow.mutate(
        {
          id: selectedId,
          inputs: { ...extraInputs, ...inputs },
        },
        {
          onSuccess: (data: RunWorkflowResponseDto) => {
            notifications.toasts.addSuccess({
              title: i18n.WORKFLOW_START_SUCCESS_TOAST,
              ...(rendering && {
                text: toMountPoint(
                  <EuiFlexGroup justifyContent={'flexEnd'}>
                    <EuiButton
                      size="s"
                      onClick={() => {
                        application.navigateToApp(WORKFLOWS_APP_ID, {
                          openInNewTab: true,
                          path: `${selectedId}?executionId=${data.workflowExecutionId}`,
                        });
                      }}
                    >
                      {i18n.WORKFLOW_START_SUCCESS_BUTTON}
                    </EuiButton>
                  </EuiFlexGroup>,
                  rendering
                ),
              }),
            });
          },
          onError: (err) => {
            notifications.toasts.addError(err instanceof Error ? err : new Error(String(err)), {
              title: i18n.WORKFLOW_START_FAILED_TOAST,
            });
          },
          onSettled: () => {
            setIsLoading(false);
            onClose();
          },
        }
      );
    },
    [
      application,
      selectedId,
      runWorkflow,
      inputs,
      notifications,
      rendering,
      onClose,
      onExecute,
    ]
  );

  const handleExecuteClick = useCallback(() => {
    if (!selectedId) return;
    if (needsManualInputs) {
      setIsInputsModalOpen(true);
    } else {
      executeWorkflow({});
    }
  }, [selectedId, needsManualInputs, executeWorkflow]);

  const workflowSelector = useMemo(
    () => (
      <WorkflowSelector
        config={{
          visibility,
          filterFunction: (workflows) => {
            const enabled = workflows.filter((w) => w.enabled);
            if (!tags || tags.length === 0) return enabled;
            return enabled.filter((w) => tags.some((tag) => w.tags?.includes(tag)));
          },
          sortFunction: (workflows) =>
            workflows.sort((a, b) => {
              const aHasType = a.definition?.triggers?.some((t) =>
                triggerTypes.includes(t.type)
              );
              const bHasType = b.definition?.triggers?.some((t) =>
                triggerTypes.includes(t.type)
              );
              if (aHasType && !bHasType) return -1;
              if (!aHasType && bHasType) return 1;
              return 0;
            }),
          listView: true,
          hideTopRowHeader: true,
          hideViewWorkflowLink: true,
          listViewMaxHeight: 240,
          showSelectedInSearch: false,
        }}
        selectedWorkflowId={selectedId || undefined}
        onWorkflowChange={setSelectedId}
      />
    ),
    [selectedId, triggerTypes, visibility, tags]
  );

  return (
    <>
      <div css={{ position: 'relative' }}>
        {workflowSelector}
        {isLoading && (
          <div
            css={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: euiTheme.colors.backgroundBasePlain,
              opacity: 0.75,
              zIndex: euiTheme.levels.header,
            }}
          >
            <EuiLoadingSpinner size="m" />
          </div>
        )}
      </div>
      <EuiButton
        data-test-subj={executeButtonTestSubj}
        fullWidth
        size="s"
        onClick={handleExecuteClick}
        disabled={!selectedId || isLoading}
      >
        {i18n.RUN_WORKFLOW_BUTTON}
      </EuiButton>
      {isInputsModalOpen && selectedWorkflow && normalizedInputs && (
        <RunWorkflowInputsModal
          workflowName={selectedWorkflow.name}
          inputs={normalizedInputs}
          onSubmit={(values) => {
            setIsInputsModalOpen(false);
            executeWorkflow(values);
          }}
          onCancel={() => setIsInputsModalOpen(false)}
        />
      )}
    </>
  );
};
