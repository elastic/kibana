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
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowListItemDto } from '@kbn/workflows';
import React, { useCallback, useMemo, useState } from 'react';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';

interface UseWorkflowBulkActionsProps {
  selectedWorkflows: WorkflowListItemDto[];
  onAction: () => void;
  onActionSuccess: () => void;
}

interface UseWorkflowBulkActionsReturn {
  panels: EuiContextMenuPanelDescriptor[];
  modals: JSX.Element;
}

export const useWorkflowBulkActions = ({
  selectedWorkflows,
  onAction,
  onActionSuccess,
}: UseWorkflowBulkActionsProps): UseWorkflowBulkActionsReturn => {
  const { application } = useKibana().services;
  const { deleteWorkflows, updateWorkflow } = useWorkflowActions();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const canDeleteWorkflow = application?.capabilities.workflowsManagement.deleteWorkflow;
  const canUpdateWorkflow = application?.capabilities.workflowsManagement.updateWorkflow;

  const isDisabled = selectedWorkflows.length === 0;

  const handleDeleteWorkflows = useCallback(() => {
    onAction();
    setShowDeleteModal(true);
  }, [onAction]);

  const confirmDelete = useCallback(() => {
    const ids = selectedWorkflows.map((workflow) => workflow.id);
    deleteWorkflows.mutate(
      { ids },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onActionSuccess();
        },
        onError: () => {
          setShowDeleteModal(false);
        },
      }
    );
  }, [selectedWorkflows, deleteWorkflows, onActionSuccess]);

  const cancelDelete = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const bulkUpdateWorkflows = useCallback(
    (workflowsToUpdate: WorkflowListItemDto[], updateData: { enabled: boolean }) => {
      onAction();

      const updatePromises = workflowsToUpdate.map(
        (workflow) =>
          new Promise<void>((resolve) => {
            updateWorkflow.mutate(
              {
                id: workflow.id,
                workflow: updateData,
              },
              {
                onSettled: () => {
                  resolve();
                },
              }
            );
          })
      );

      Promise.allSettled(updatePromises).then(() => {
        onActionSuccess();
      });
    },
    [updateWorkflow, onAction, onActionSuccess]
  );

  const handleEnableWorkflows = useCallback(() => {
    const disabledWorkflows = selectedWorkflows.filter((workflow) => !workflow.enabled);
    bulkUpdateWorkflows(disabledWorkflows, { enabled: true });
  }, [selectedWorkflows, bulkUpdateWorkflows]);

  const handleDisableWorkflows = useCallback(() => {
    const enabledWorkflows = selectedWorkflows.filter((workflow) => workflow.enabled);
    bulkUpdateWorkflows(enabledWorkflows, { enabled: false });
  }, [selectedWorkflows, bulkUpdateWorkflows]);

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

    if (canUpdateWorkflow && canDeleteWorkflow && mainPanelItems.length > 0) {
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
        icon: <EuiIcon type="trash" size="m" color="danger" />,
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
    isDisabled,
    handleEnableWorkflows,
    handleDisableWorkflows,
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
      </>
    );
  }, [showDeleteModal, selectedWorkflows.length, cancelDelete, confirmDelete, modalTitleId]);

  return {
    panels,
    modals,
  };
};
