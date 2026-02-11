/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { z } from '@kbn/zod/v4';
import type { ContextOverrideData } from '../../../shared/utils/build_step_context_override/build_step_context_override';
import { TestStepModal } from '../../run_workflow/ui/test_step_modal';

interface ResumeExecutionButtonProps {
  executionId: string;
  resumeMessage?: string;
  autoOpen?: boolean;
}

export const ResumeExecutionButton: React.FC<ResumeExecutionButtonProps> = ({
  executionId,
  resumeMessage,
  autoOpen = false,
}) => {
  const { application, http, notifications } = useKibana().services;
  const [isModalOpen, setIsModalOpen] = useState(autoOpen);
  const canExecuteWorkflow = application?.capabilities.workflowsManagement.executeWorkflow;

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async ({ stepInputs }: { stepInputs: Record<string, unknown> }) => {
    try {
      await http?.post(`/api/workflowExecutions/${executionId}/resume`, {
        body: JSON.stringify({ input: stepInputs }),
      });
      notifications?.toasts.addSuccess({
        title: i18n.translate(
          'workflowsManagement.executionDetail.resumeButton.successNotificationTitle',
          { defaultMessage: 'Workflow resumed successfully' }
        ),
      });
      setIsModalOpen(false);
    } catch (error) {
      notifications?.toasts.addError?.(error, {
        title: i18n.translate(
          'workflowsManagement.executionDetail.resumeButton.errorNotificationTitle',
          { defaultMessage: 'Error resuming workflow' }
        ),
      });
    }
  };

  // Minimal schema - accept any JSON object
  const contextOverride: ContextOverrideData = {
    stepContext: {},
    schema: z.record(z.string(), z.any()),
  };

  return (
    <>
      <EuiButton
        color="success"
        iconType="playFilled"
        onClick={handleOpenModal}
        data-test-subj="resumeExecutionButton"
        disabled={!canExecuteWorkflow}
        size="s"
        fullWidth
      >
        <FormattedMessage
          id="workflowsManagement.executionDetail.resumeButton"
          defaultMessage="Resume workflow"
        />
      </EuiButton>
      {isModalOpen && (
        <TestStepModal
          mode="resume"
          resumeMessage={resumeMessage}
          initialcontextOverride={contextOverride}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};
