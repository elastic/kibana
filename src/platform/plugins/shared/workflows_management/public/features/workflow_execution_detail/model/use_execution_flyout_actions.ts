/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copyToClipboard } from '@elastic/eui';
import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { useNavigateToExecution } from '../../../hooks/navigation/use_navigate_to_execution';
import { useKibana } from '../../../hooks/use_kibana';

const linkCopiedMessage = i18n.translate('workflows.executionFlyout.share.linkCopied', {
  defaultMessage: 'Execution link copied',
});

interface UseExecutionFlyoutActionsParams {
  executionId: string;
  workflowExecution: WorkflowExecutionDto | undefined;
  selectedStepExecutionId: string | null;
}

interface ExecutionFlyoutActions {
  /** Copies a link to this run, including the selected step, to the clipboard. */
  handleShare: () => void;
  handleOpenFailedStepInEditor: (stepId: string) => void;
}

export const useExecutionFlyoutActions = ({
  executionId,
  workflowExecution,
  selectedStepExecutionId,
}: UseExecutionFlyoutActionsParams): ExecutionFlyoutActions => {
  const { application, notifications } = useKibana().services;
  const { href: executionHref } = useNavigateToExecution({
    workflowId: workflowExecution?.workflowId ?? '',
    executionId,
  });

  const handleShare = useCallback(() => {
    if (!workflowExecution?.workflowId) return;
    const hrefWithStep =
      selectedStepExecutionId != null
        ? `${executionHref}${
            executionHref.includes('?') ? '&' : '?'
          }stepExecutionId=${encodeURIComponent(selectedStepExecutionId)}`
        : executionHref;
    const absolute =
      typeof window !== 'undefined' ? `${window.location.origin}${hrefWithStep}` : hrefWithStep;
    copyToClipboard(absolute);
    notifications.toasts.addSuccess(linkCopiedMessage, { toastLifeTimeMs: 2000 });
  }, [executionHref, notifications.toasts, selectedStepExecutionId, workflowExecution?.workflowId]);

  const handleOpenFailedStepInEditor = useCallback(
    (_stepId: string) => {
      if (!workflowExecution?.workflowId) return;
      application.navigateToApp('workflows', { path: `/${workflowExecution.workflowId}` });
    },
    [application, workflowExecution?.workflowId]
  );

  return { handleShare, handleOpenFailedStepInEditor };
};
