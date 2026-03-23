/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { ResumeExecutionModal } from './resume_execution_modal';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';

interface ResumeExecutionButtonProps {
  executionId: string;
  resumeMessage?: string;
  /** When true, opens the input modal immediately on mount */
  autoOpen?: boolean;
}

export const ResumeExecutionButton: React.FC<ResumeExecutionButtonProps> = ({
  executionId,
  resumeMessage,
  autoOpen = false,
}) => {
  const { http, notifications } = useKibana().services;
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const { clearResumeParam } = useWorkflowUrlState();
  const [isModalOpen, setIsModalOpen] = useState(autoOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Honour autoOpen changes (e.g. when navigated to with ?resume=true)
  useEffect(() => {
    if (autoOpen) setIsModalOpen(true);
  }, [autoOpen]);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => {
    clearResumeParam();
    setIsModalOpen(false);
  }, [clearResumeParam]);

  const handleSubmit = useCallback(
    async ({ stepInputs }: { stepInputs: Record<string, unknown> }) => {
      if (!http) {
        throw new Error('HTTP service is unavailable');
      }
      setIsSubmitting(true);
      try {
        await http.post(`/api/workflowExecutions/${executionId}/resume`, {
          body: JSON.stringify({ input: stepInputs }),
        });
        notifications?.toasts.addSuccess({
          title: i18n.translate(
            'workflowsManagement.executionDetail.resumeButton.successNotificationTitle',
            { defaultMessage: 'Workflow resumed' }
          ),
        });
        setIsSubmitted(true);
        closeModal();
      } catch (error) {
        notifications?.toasts.addError?.(error, {
          title: i18n.translate(
            'workflowsManagement.executionDetail.resumeButton.errorNotificationTitle',
            { defaultMessage: 'Error resuming workflow' }
          ),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [executionId, http, notifications, closeModal]
  );

  return (
    <>
      <EuiCallOut color="warning" data-test-subj="waitForInputCallout">
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem>
            <FormattedMessage
              id="workflowsManagement.executionDetail.resumeButton.calloutText"
              defaultMessage="User action is required"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="warning"
              size="s"
              onClick={openModal}
              disabled={!canExecuteWorkflow || isSubmitting || isSubmitted}
              isLoading={isSubmitting}
              data-test-subj="provideActionButton"
            >
              <FormattedMessage
                id="workflowsManagement.executionDetail.resumeButton.label"
                defaultMessage="Provide action"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>

      {isModalOpen && (
        <ResumeExecutionModal
          resumeMessage={resumeMessage}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
};
