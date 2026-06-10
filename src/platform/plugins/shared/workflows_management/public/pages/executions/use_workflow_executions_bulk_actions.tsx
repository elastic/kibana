/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { i18n } from '@kbn/i18n';
import type { CustomBulkActions } from '@kbn/unified-data-table';
import { useRunWorkflow, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { buildReplayInputsFromExecutionContext } from './build_replay_inputs_from_execution_context';
import { getWorkflowExecutionSource } from './workflow_executions_table_cells';
import { useKibana } from '../../hooks/use_kibana';

export const useWorkflowExecutionsBulkActions = ({
  onRefresh,
  rows,
}: {
  onRefresh: () => void;
  rows: DataTableRecord[];
}): CustomBulkActions => {
  const { notifications } = useKibana().services;
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const { mutateAsync: runWorkflow } = useRunWorkflow();
  const rowsById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

  const rerunSelectedExecutions = useCallback(
    async (selectedDocIds: string[]) => {
      const executionsToRerun = selectedDocIds.flatMap((docId) => {
        const row = rowsById.get(docId);
        if (!row) {
          return [];
        }
        const source = getWorkflowExecutionSource(row);
        return source?.workflowId
          ? [{ workflowId: source.workflowId, context: source.context }]
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
    [notifications.toasts, onRefresh, rowsById, runWorkflow]
  );

  return useMemo<CustomBulkActions>(() => {
    if (!canExecuteWorkflow) {
      return [];
    }

    return [
      {
        key: 'bulk-re-run',
        icon: 'refresh',
        label: i18n.translate('workflowsManagement.executionsPage.bulkReRun.label', {
          defaultMessage: 'Re-run',
        }),
        'data-test-subj': 'workflowExecutionsBulkActionReRun',
        onClick: ({ selectedDocIds }) => {
          void rerunSelectedExecutions(selectedDocIds);
        },
      },
    ];
  }, [canExecuteWorkflow, rerunSelectedExecutions]);
};
