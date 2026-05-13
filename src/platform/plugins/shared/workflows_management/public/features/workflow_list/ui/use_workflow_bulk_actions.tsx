/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { EuiConfirmModal, EuiIcon, EuiTextColor, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { ExportReferencesModal } from './export_references_modal';
import { useExportWithReferences } from './use_export_with_references';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';

interface UseWorkflowBulkActionsProps {
  selectedWorkflows: WorkflowListItemDto[];
  allWorkflows: WorkflowListItemDto[];
  onAction: () => void;
  onActionSuccess: () => void;
  deselectWorkflows: () => void;
}

interface UseWorkflowBulkActionsReturn {
  panels: EuiContextMenuPanelDescriptor[];
  modals: JSX.Element;
}

const TOAST_LIFE_TIME_MS = 3000;

export const useWorkflowBulkActions = ({
  selectedWorkflows,
  allWorkflows,
  onAction,
  onActionSuccess,
  deselectWorkflows,
}: UseWorkflowBulkActionsProps): UseWorkflowBulkActionsReturn => {
  const { application, notifications } = useKibana().services;
  const { deleteWorkflows, updateWorkflow } = useWorkflowActions();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const allWorkflowsMap = useMemo(
    () => new Map(allWorkflows.map((w) => [w.id, w])),
    [allWorkflows]
  );

  const {
    exportModalState,
    startExport,
    handleIgnore: handleExportIgnore,
    handleAddDirect: handleExportAddDirect,
    handleAddAll: handleExportAddAll,
    handleCancel: handleExportCancel,
  } = useExportWithReferences({
    allWorkflowsMap,
    onComplete: deselectWorkflows,
  });

  const canDeleteWorkflow = application?.capabilities.workflowsManagement.deleteWorkflow;
  const canUpdateWorkflow = application?.capabilities.workflowsManagement.updateWorkflow;
  const canReadWorkflow = application?.capabilities.workflowsManagement.readWorkflow;

  const isDisabled = selectedWorkflows.length === 0;

  const handleDeleteWorkflows = useCallback(() => {
    onAction();
    setShowDeleteModal(true);
  }, [onAction]);

  const confirmDelete = useCallback(() => {
    const ids = selectedWorkflows.map((workflow) => workflow.id);
    const count = ids.length;

    setShowDeleteModal(false);
    deselectWorkflows();

    deleteWorkflows.mutate(
      { ids },
      {
        onSuccess: () => {
          onActionSuccess();
        },
        onError: (err) => {
          onActionSuccess();
          notifications?.toasts.addError(err as Error, {
            title: i18n.translate('workflows.bulkActions.deleteError', {
              defaultMessage:
                'Failed to delete {count} {count, plural, one {workflow} other {workflows}}',
              values: { count },
            }),
            toastLifeTimeMs: TOAST_LIFE_TIME_MS,
          });
        },
      }
    );
  }, [selectedWorkflows, deleteWorkflows, onActionSuccess, deselectWorkflows, notifications]);

  const cancelDelete = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const bulkUpdateWorkflows = useCallback(
    (workflowsToUpdate: WorkflowListItemDto[], updateData: { enabled: boolean }) => {
      onAction();
      deselectWorkflows();

      const totalCount = workflowsToUpdate.length;
      let completedCount = 0;
      let failedCount = 0;

      const actionType = updateData.enabled ? 'enable' : 'disable';
      const actionLabel = updateData.enabled ? 'enabled' : 'disabled';

      workflowsToUpdate.forEach((workflow) => {
        updateWorkflow.mutate(
          {
            id: workflow.id,
            workflow: updateData,
            isBulkAction: true,
            bulkActionCount: totalCount,
            skipRefetch: true,
          },
          {
            onSettled: (data, error) => {
              completedCount++;
              if (error) {
                failedCount++;
              }

              if (completedCount === totalCount) {
                onActionSuccess();

                const successCount = totalCount - failedCount;

                if (failedCount > 0) {
                  if (successCount === 0) {
                    notifications?.toasts.addDanger(
                      i18n.translate(`workflows.bulkActions.${actionType}Error`, {
                        defaultMessage:
                          'Failed to {actionType} {count} {count, plural, one {workflow} other {workflows}}',
                        values: { count: totalCount, actionType },
                      }),
                      { toastLifeTimeMs: 3000 }
                    );
                  } else {
                    notifications?.toasts.addWarning(
                      i18n.translate(`workflows.bulkActions.${actionType}PartialSuccess`, {
                        defaultMessage:
                          '{successCount} of {totalCount} workflows {actionLabel}. {failedCount} failed.',
                        values: { successCount, totalCount, failedCount, actionLabel },
                      }),
                      { toastLifeTimeMs: 3000 }
                    );
                  }
                }
              }
            },
          }
        );
      });
    },
    [updateWorkflow, onAction, onActionSuccess, deselectWorkflows, notifications]
  );

  const handleEnableWorkflows = useCallback(() => {
    const disabledWorkflows = selectedWorkflows.filter((workflow) => !workflow.enabled);
    bulkUpdateWorkflows(disabledWorkflows, { enabled: true });
  }, [selectedWorkflows, bulkUpdateWorkflows]);

  const handleDisableWorkflows = useCallback(() => {
    const enabledWorkflows = selectedWorkflows.filter((workflow) => workflow.enabled);
    bulkUpdateWorkflows(enabledWorkflows, { enabled: false });
  }, [selectedWorkflows, bulkUpdateWorkflows]);

  const handleExportWorkflows = useCallback(() => {
    onAction();
    startExport(selectedWorkflows);
  }, [selectedWorkflows, onAction, startExport]);

  const panels = useMemo((): EuiContextMenuPanelDescriptor[] => {
    const mainPanelItems: EuiContextMenuPanelItemDescriptor[] = [];

    const hasDisabledWorkflows = selectedWorkflows.some((workflow) => !workflow.enabled);
    const hasEnabledWorkflows = selectedWorkflows.some((workflow) => workflow.enabled);

    if (canUpdateWorkflow && hasDisabledWorkflows) {
      mainPanelItems.push({
        name: i18n.translate('workflows.bulkActions.enable', {
          defaultMessage: 'Enable',
        }),
        icon: 'play',
        disabled: isDisabled,
        onClick: handleEnableWorkflows,
        'data-test-subj': 'workflows-bulk-action-enable',
        key: 'workflows-bulk-action-enable',
      });
    }

    if (canUpdateWorkflow && hasEnabledWorkflows) {
      mainPanelItems.push({
        name: i18n.translate('workflows.bulkActions.disable', {
          defaultMessage: 'Disable',
        }),
        icon: 'pause',
        disabled: isDisabled,
        onClick: handleDisableWorkflows,
        'data-test-subj': 'workflows-bulk-action-disable',
        key: 'workflows-bulk-action-disable',
      });
    }

    const hasExportableWorkflows = selectedWorkflows.some((w) => w.definition !== null);
    if (canReadWorkflow && hasExportableWorkflows) {
      mainPanelItems.push({
        name: i18n.translate('workflows.bulkActions.export', {
          defaultMessage: 'Export',
        }),
        icon: 'exportAction',
        disabled: isDisabled,
        onClick: handleExportWorkflows,
        'data-test-subj': 'workflows-bulk-action-export',
        key: 'workflows-bulk-action-export',
      });
    }

    if (mainPanelItems.length > 0 && canDeleteWorkflow) {
      mainPanelItems.push({
        isSeparator: true as const,
        key: 'bulk-actions-separator',
        'data-test-subj': 'bulk-actions-separator',
      });
    }

    if (canDeleteWorkflow) {
      mainPanelItems.push({
        name: (
          <EuiTextColor color="danger">
            {i18n.translate('workflows.bulkActions.delete', {
              defaultMessage: 'Delete',
            })}
          </EuiTextColor>
        ),
        icon: <EuiIcon type="trash" size="m" color="danger" aria-hidden={true} />,
        disabled: isDisabled,
        onClick: handleDeleteWorkflows,
        'data-test-subj': 'workflows-bulk-action-delete',
        key: 'workflows-bulk-action-delete',
      });
    }

    return [
      {
        id: 0,
        items: mainPanelItems,
        title: i18n.translate('workflows.bulkActions.title', {
          defaultMessage: 'Actions',
        }),
      },
    ];
  }, [
    selectedWorkflows,
    canUpdateWorkflow,
    canDeleteWorkflow,
    canReadWorkflow,
    isDisabled,
    handleEnableWorkflows,
    handleDisableWorkflows,
    handleExportWorkflows,
    handleDeleteWorkflows,
  ]);

  const modals = useMemo(() => {
    return (
      <>
        {showDeleteModal && (
          <EuiConfirmModal
            title={i18n.translate('workflows.bulkActions.deleteModal.title', {
              defaultMessage: 'Delete {count} workflows?',
              values: { count: selectedWorkflows.length },
            })}
            titleProps={{ id: modalTitleId }}
            aria-labelledby={modalTitleId}
            onCancel={cancelDelete}
            onConfirm={confirmDelete}
            cancelButtonText={i18n.translate('workflows.bulkActions.deleteModal.cancel', {
              defaultMessage: 'Cancel',
            })}
            confirmButtonText={i18n.translate('workflows.bulkActions.deleteModal.confirm', {
              defaultMessage: 'Delete',
            })}
            buttonColor="danger"
            defaultFocusedButton="cancel"
            data-test-subj="workflows-bulk-delete-modal"
          >
            <p>
              {i18n.translate('workflows.bulkActions.deleteModal.message', {
                defaultMessage:
                  'You are about to delete {count} workflows. This action cannot be undone.',
                values: { count: selectedWorkflows.length },
              })}
            </p>
          </EuiConfirmModal>
        )}
        {exportModalState && (
          <ExportReferencesModal
            missingWorkflows={exportModalState.missingWorkflows}
            onIgnore={handleExportIgnore}
            onAddDirect={handleExportAddDirect}
            onAddAll={handleExportAddAll}
            onCancel={handleExportCancel}
          />
        )}
      </>
    );
  }, [
    showDeleteModal,
    selectedWorkflows.length,
    cancelDelete,
    confirmDelete,
    modalTitleId,
    exportModalState,
    handleExportIgnore,
    handleExportAddDirect,
    handleExportAddAll,
    handleExportCancel,
  ]);

  return {
    panels,
    modals,
  };
};
