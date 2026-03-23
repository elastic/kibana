/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { isNotNullable } from '../../../../common/lib/utils';
import {
  exportSingleWorkflow,
  exportWorkflows,
  findMissingReferencedIds,
  resolveAllReferences,
} from '../../../common/lib/export_workflows';
import type { WorkflowExportReferenceResolution } from '../../../common/lib/telemetry/events/workflows/import_export/types';
import { useTelemetry } from '../../../hooks/use_telemetry';

const TOAST_LIFE_TIME_MS = 3000;

export interface ExportModalState {
  missingWorkflows: WorkflowListItemDto[];
  pendingExport: WorkflowListItemDto[];
}

interface UseExportWithReferencesParams {
  allWorkflowsMap: Map<string, WorkflowListItemDto>;
  onComplete?: () => void;
}

export const useExportWithReferences = ({
  allWorkflowsMap,
  onComplete,
}: UseExportWithReferencesParams) => {
  const { http, notifications } = useKibana().services;
  const telemetry = useTelemetry();
  const [exportModalState, setExportModalState] = useState<ExportModalState | null>(null);

  const performExport = useCallback(
    async (
      workflowsToExport: WorkflowListItemDto[],
      referenceResolution: WorkflowExportReferenceResolution
    ) => {
      if (!http) return;
      let exportError: Error | undefined;
      try {
        const exportedCount = await exportWorkflows(workflowsToExport, http);
        const skippedCount = workflowsToExport.length - exportedCount;

        if (skippedCount > 0) {
          notifications?.toasts.addWarning(
            i18n.translate('workflows.export.partialSuccess', {
              defaultMessage:
                'Exported {exportedCount} {exportedCount, plural, one {workflow} other {workflows}}. ' +
                '{skippedCount} {skippedCount, plural, one {workflow was} other {workflows were}} skipped due to missing definitions.',
              values: { exportedCount, skippedCount },
            }),
            { toastLifeTimeMs: TOAST_LIFE_TIME_MS }
          );
        } else {
          notifications?.toasts.addSuccess(
            i18n.translate('workflows.export.success', {
              defaultMessage:
                'Successfully exported {exportedCount} {exportedCount, plural, one {workflow} other {workflows}}.',
              values: { exportedCount },
            }),
            { toastLifeTimeMs: TOAST_LIFE_TIME_MS }
          );
        }
      } catch (err) {
        exportError = err instanceof Error ? err : new Error(String(err));
        notifications?.toasts.addError(exportError, {
          title: i18n.translate('workflows.export.error', {
            defaultMessage: 'Failed to export workflows',
          }),
          toastLifeTimeMs: TOAST_LIFE_TIME_MS,
        });
      }
      telemetry.reportWorkflowExported({
        workflowCount: workflowsToExport.length,
        format: 'zip',
        referenceResolution,
        error: exportError,
      });
      onComplete?.();
    },
    [http, notifications, onComplete, telemetry]
  );

  const exportWithoutReferences = useCallback(
    (workflowsToExport: WorkflowListItemDto[]) => {
      if (workflowsToExport.length === 1) {
        exportSingleWorkflow(workflowsToExport[0]);
        notifications?.toasts.addSuccess(
          i18n.translate('workflows.export.singleSuccess', {
            defaultMessage: 'Workflow exported successfully.',
          }),
          { toastLifeTimeMs: TOAST_LIFE_TIME_MS }
        );
        telemetry.reportWorkflowExported({
          workflowCount: 1,
          format: 'yaml',
          referenceResolution: 'none',
        });
        onComplete?.();
      } else {
        performExport(workflowsToExport, 'none');
      }
    },
    [performExport, notifications, onComplete, telemetry]
  );

  const startExport = useCallback(
    (workflowsToExport: WorkflowListItemDto[]) => {
      const missingIds = findMissingReferencedIds(workflowsToExport);

      if (missingIds.length === 0) {
        exportWithoutReferences(workflowsToExport);
        return;
      }

      const missingWorkflows = missingIds
        .map((id) => allWorkflowsMap.get(id))
        .filter(isNotNullable);

      if (missingWorkflows.length === 0) {
        exportWithoutReferences(workflowsToExport);
        return;
      }

      setExportModalState({ missingWorkflows, pendingExport: workflowsToExport });
    },
    [allWorkflowsMap, exportWithoutReferences]
  );

  const handleIgnore = useCallback(() => {
    if (exportModalState) {
      performExport(exportModalState.pendingExport, 'ignore');
    }
    setExportModalState(null);
  }, [exportModalState, performExport]);

  const handleAddDirect = useCallback(() => {
    if (exportModalState) {
      const merged = [...exportModalState.pendingExport, ...exportModalState.missingWorkflows];
      performExport(merged, 'add_direct');
    }
    setExportModalState(null);
  }, [exportModalState, performExport]);

  const handleAddAll = useCallback(() => {
    if (exportModalState) {
      const merged = [...exportModalState.pendingExport, ...exportModalState.missingWorkflows];
      const allResolved = resolveAllReferences(merged, allWorkflowsMap);
      performExport(allResolved, 'add_all');
    }
    setExportModalState(null);
  }, [exportModalState, performExport, allWorkflowsMap]);

  const handleCancel = useCallback(() => {
    setExportModalState(null);
  }, []);

  return {
    exportModalState,
    startExport,
    handleIgnore,
    handleAddDirect,
    handleAddAll,
    handleCancel,
  };
};
