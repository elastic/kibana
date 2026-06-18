/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { copyToClipboard } from '@elastic/eui';
import { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { useRunWorkflow, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { buildReplayInputsFromExecutionContext } from './build_replay_inputs_from_execution_context';
import type { RerunWorkflowExecutionParams } from './build_replay_inputs_from_execution_context';
import { formatWorkflowExecutionsForCopy } from './format_workflow_executions_for_copy';
import { useKibana } from '../../hooks/use_kibana';

export const useWorkflowExecutionRerun = ({
  setSelectedExecution,
}: {
  setSelectedExecution: (executionId: string | null) => void;
}) => {
  const { notifications } = useKibana().services;
  const { mutateAsync: runWorkflow } = useRunWorkflow();

  return useCallback(
    async ({ workflowId, context }: RerunWorkflowExecutionParams) => {
      try {
        const { workflowExecutionId } = await runWorkflow({
          id: workflowId,
          inputs: buildReplayInputsFromExecutionContext(context),
        });

        notifications.toasts.addSuccess(
          i18n.translate('workflowsManagement.executionsPage.bulkReRun.success', {
            defaultMessage: '{count, plural, one {Re-ran # execution} other {Re-ran # executions}}',
            values: { count: 1 },
          }),
          { toastLifeTimeMs: 3000 }
        );

        setSelectedExecution(workflowExecutionId);
      } catch (error) {
        notifications.toasts.addError(error as Error, {
          title: i18n.translate('workflowsManagement.executionsPage.bulkReRun.partialFailure', {
            defaultMessage:
              '{count, plural, one {Failed to re-run # execution} other {Failed to re-run # executions}}',
            values: { count: 1 },
          }),
          toastLifeTimeMs: 5000,
        });
      }
    },
    [notifications.toasts, runWorkflow, setSelectedExecution]
  );
};

export const useWorkflowExecutionsBulkActions = ({
  onAction,
  onRefresh,
  executions,
  selectedExecutionIds,
}: {
  onAction: () => void;
  onRefresh: () => void;
  executions: WorkflowExecutionListItemDto[];
  selectedExecutionIds: string[];
}): { panels: EuiContextMenuPanelDescriptor[] } => {
  const { notifications } = useKibana().services;
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const { mutateAsync: runWorkflow } = useRunWorkflow();
  const executionsById = useMemo(
    () => new Map(executions.map((execution) => [execution.id, execution])),
    [executions]
  );

  const copySelectedExecutionsAsJson = useCallback(
    (executionIdsToCopy: string[]) => {
      const selectedExecutions = executionIdsToCopy.flatMap((executionId) => {
        const execution = executionsById.get(executionId);
        return execution ? [execution] : [];
      });

      if (selectedExecutions.length === 0) {
        return;
      }

      const text = formatWorkflowExecutionsForCopy(selectedExecutions);
      if (!copyToClipboard(text)) {
        notifications.toasts.addWarning({
          title: i18n.translate('workflowsManagement.executionsPage.bulkCopyAsJson.copyFailed', {
            defaultMessage: 'Unable to copy to clipboard in this browser',
          }),
        });
        return;
      }

      notifications.toasts.addSuccess({
        title: i18n.translate('workflowsManagement.executionsPage.bulkCopyAsJson.successTitle', {
          defaultMessage: 'Copied to clipboard',
        }),
        text: i18n.translate('workflowsManagement.executionsPage.bulkCopyAsJson.successText', {
          defaultMessage:
            '{count, plural, one {# execution copied} other {# executions copied}} as JSON',
          values: { count: selectedExecutions.length },
        }),
      });
    },
    [executionsById, notifications.toasts]
  );

  const rerunSelectedExecutions = useCallback(
    async (executionIdsToRerun: string[]) => {
      const executionsToRerun = executionIdsToRerun.flatMap((executionId) => {
        const execution = executionsById.get(executionId);
        return execution?.workflowId
          ? [{ workflowId: execution.workflowId, context: execution.context }]
          : [];
      });

      if (executionsToRerun.length === 0) {
        return;
      }

      const results = await Promise.allSettled(
        executionsToRerun.map(({ workflowId, context }) =>
          runWorkflow({
            id: workflowId,
            inputs: buildReplayInputsFromExecutionContext(context),
          })
        )
      );

      const successCount = results.filter((result) => result.status === 'fulfilled').length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        notifications.toasts.addSuccess(
          i18n.translate('workflowsManagement.executionsPage.bulkReRun.success', {
            defaultMessage: '{count, plural, one {Re-ran # execution} other {Re-ran # executions}}',
            values: { count: successCount },
          }),
          { toastLifeTimeMs: 3000 }
        );
      }

      const firstFailure = results.find((result) => result.status === 'rejected');
      if (firstFailure?.status === 'rejected') {
        const error =
          firstFailure.reason instanceof Error
            ? firstFailure.reason
            : new Error(String(firstFailure.reason));
        notifications.toasts.addError(error, {
          title: i18n.translate('workflowsManagement.executionsPage.bulkReRun.partialFailure', {
            defaultMessage:
              '{count, plural, one {Failed to re-run # execution} other {Failed to re-run # executions}}',
            values: { count: failureCount },
          }),
          toastLifeTimeMs: 5000,
        });
      }

      onRefresh();
    },
    [executionsById, notifications.toasts, onRefresh, runWorkflow]
  );

  return useMemo(() => {
    const items = [
      {
        key: 'bulk-copy-as-json',
        icon: 'copy',
        name: i18n.translate('workflowsManagement.executionsPage.bulkCopyAsJson.label', {
          defaultMessage: 'Copy as JSON',
        }),
        'data-test-subj': 'workflowExecutionsBulkActionCopyAsJson',
        onClick: () => {
          onAction();
          copySelectedExecutionsAsJson(selectedExecutionIds);
        },
      },
    ];

    if (canExecuteWorkflow) {
      items.push({
        key: 'bulk-re-run',
        icon: 'refresh',
        name: i18n.translate('workflowsManagement.executionsPage.bulkReRun.label', {
          defaultMessage: 'Re-run',
        }),
        'data-test-subj': 'workflowExecutionsBulkActionReRun',
        onClick: () => {
          onAction();
          void rerunSelectedExecutions(selectedExecutionIds);
        },
      });
    }

    return {
      panels: [
        {
          id: 0,
          title: i18n.translate('workflowsManagement.executionsPage.bulkActions.title', {
            defaultMessage: 'Actions',
          }),
          items,
        },
      ],
    };
  }, [
    canExecuteWorkflow,
    copySelectedExecutionsAsJson,
    onAction,
    rerunSelectedExecutions,
    selectedExecutionIds,
  ]);
};
