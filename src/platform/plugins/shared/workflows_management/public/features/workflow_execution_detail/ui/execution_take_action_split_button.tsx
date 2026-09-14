/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  copyToClipboard,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiSplitButton,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { isDangerousStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { useNavigateToExecution } from '../../../hooks/navigation/use_navigate_to_execution';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';

interface ExecutionTakeActionSplitButtonProps {
  execution: WorkflowExecutionDto;
  failedStepId?: string;
  onOpenFailedStepInEditor?: (stepId: string) => void;
}

export const ExecutionTakeActionSplitButton = React.memo<ExecutionTakeActionSplitButtonProps>(
  ({ execution, failedStepId, onOpenFailedStepInEditor }) => {
    const { notifications, application } = useKibana().services;
    const { canExecuteWorkflow, canUpdateWorkflow } = useWorkflowsCapabilities();
    const { pathname } = useLocation();
    const { updateUrlState } = useWorkflowUrlState();
    const { href: executionHref } = useNavigateToExecution({
      workflowId: execution.workflowId ?? '',
      executionId: execution.id,
    });
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isFailed = isDangerousStatus(execution.status);

    const handleRerun = useCallback(() => {
      if (!canExecuteWorkflow || !execution.workflowId) return;

      // Stay on this execution so the flyout does not close behind the modal.
      if (pathname === `/${execution.workflowId}`) {
        updateUrlState({ replayExecutionId: execution.id });
        return;
      }

      application.navigateToApp('workflows', {
        path: `/${execution.workflowId}?tab=executions&executionId=${execution.id}&replayExecutionId=${execution.id}`,
      });
    }, [
      application,
      canExecuteWorkflow,
      execution.id,
      execution.workflowId,
      pathname,
      updateUrlState,
    ]);

    const handleEditWorkflow = useCallback(() => {
      setIsMenuOpen(false);
      application.navigateToApp('workflows', { path: `/${execution.workflowId}` });
    }, [application, execution.workflowId]);

    const handleCopyLink = useCallback(() => {
      setIsMenuOpen(false);
      const absolute =
        typeof window !== 'undefined' ? `${window.location.origin}${executionHref}` : executionHref;
      copyToClipboard(absolute);
      notifications.toasts.addSuccess(
        i18n.translate('workflows.executionFlyout.takeAction.linkCopied', {
          defaultMessage: 'Execution link copied',
        }),
        { toastLifeTimeMs: 2000 }
      );
    }, [executionHref, notifications.toasts]);

    const handleOpenFailedStep = useCallback(() => {
      setIsMenuOpen(false);
      if (failedStepId && onOpenFailedStepInEditor) {
        onOpenFailedStepInEditor(failedStepId);
      }
    }, [failedStepId, onOpenFailedStepInEditor]);

    const menuItems = useMemo(() => {
      const items: React.ReactElement[] = [];
      if (canExecuteWorkflow) {
        items.push(
          <EuiContextMenuItem
            key="rerun"
            icon="refresh"
            onClick={() => {
              setIsMenuOpen(false);
              void handleRerun();
            }}
            data-test-subj="workflowExecutionFlyoutReRunMenuItem"
          >
            {i18n.translate('workflows.executionFlyout.takeAction.reRunWithSameInput', {
              defaultMessage: 'Re-run with same input',
            })}
          </EuiContextMenuItem>
        );
      }
      if (isFailed && failedStepId && onOpenFailedStepInEditor && canUpdateWorkflow) {
        items.push(
          <EuiContextMenuItem
            key="openFailed"
            icon="code"
            onClick={handleOpenFailedStep}
            data-test-subj="workflowExecutionFlyoutOpenFailedStep"
          >
            {i18n.translate('workflows.executionFlyout.takeAction.openFailedStep', {
              defaultMessage: 'Open failed step in editor',
            })}
          </EuiContextMenuItem>
        );
      }
      if (canUpdateWorkflow) {
        items.push(
          <EuiContextMenuItem
            key="edit"
            icon="pencil"
            onClick={handleEditWorkflow}
            data-test-subj="workflowExecutionFlyoutEditWorkflow"
          >
            {i18n.translate('workflows.executionFlyout.takeAction.editWorkflow', {
              defaultMessage: 'Edit workflow',
            })}
          </EuiContextMenuItem>
        );
      }
      items.push(
        <EuiContextMenuItem
          key="copy"
          icon="link"
          onClick={handleCopyLink}
          data-test-subj="workflowExecutionFlyoutCopyLink"
        >
          {i18n.translate('workflows.executionFlyout.takeAction.copyLink', {
            defaultMessage: 'Copy execution link',
          })}
        </EuiContextMenuItem>
      );
      // Delete execution omitted — no single-execution delete API.
      return items;
    }, [
      canExecuteWorkflow,
      canUpdateWorkflow,
      failedStepId,
      handleCopyLink,
      handleEditWorkflow,
      handleOpenFailedStep,
      handleRerun,
      isFailed,
      onOpenFailedStepInEditor,
    ]);

    if (!canExecuteWorkflow && menuItems.length === 0) {
      return null;
    }

    return (
      <EuiPopover
        aria-label={i18n.translate('workflows.executionFlyout.takeAction.menuAriaLabel', {
          defaultMessage: 'More actions',
        })}
        isOpen={isMenuOpen}
        closePopover={() => setIsMenuOpen(false)}
        panelPaddingSize="none"
        anchorPosition="upRight"
        button={
          <EuiSplitButton size="s" fill data-test-subj="workflowExecutionFlyoutTakeAction">
            <EuiSplitButton.ActionPrimary onClick={handleRerun} isDisabled={!canExecuteWorkflow}>
              {i18n.translate('workflows.executionFlyout.takeAction.reRun', {
                defaultMessage: 'Re-run',
              })}
            </EuiSplitButton.ActionPrimary>
            <EuiSplitButton.ActionSecondary
              iconType="chevronSingleDown"
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label={i18n.translate('workflows.executionFlyout.takeAction.menuAriaLabel', {
                defaultMessage: 'More actions',
              })}
            />
          </EuiSplitButton>
        }
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>
    );
  }
);

ExecutionTakeActionSplitButton.displayName = 'ExecutionTakeActionSplitButton';
