/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowsActionParams } from './types';
import { WorkflowSelector } from './workflow_selector';

const WorkflowsParamsFields: React.FunctionComponent<ActionParamsProps<WorkflowsActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { workflowId } = actionParams.subActionParams ?? {};
  const { application } = useKibana().services;

  const handleWorkflowChange = useCallback(
    (newWorkflowId: string) => {
      editAction('subActionParams', { workflowId: newWorkflowId }, index);
    },
    [editAction, index]
  );

  const handleOpenWorkflowManagementApp = useCallback(() => {
    const url = application?.getUrlForApp
      ? application.getUrlForApp('workflows')
      : '/app/workflows';
    window.open(url, '_blank');
  }, [application]);

  // Ensure proper initialization of action parameters
  useEffect(() => {
    if (!actionParams?.subAction) {
      editAction('subAction', 'run', index);
    }
    if (!actionParams?.subActionParams) {
      editAction('subActionParams', { workflowId: '' }, index);
    }
  }, [actionParams, editAction, index]);

  const errorMessages = errors['subActionParams.workflowId'];
  const errorMessage = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
  const validationError = typeof errorMessage === 'string' ? errorMessage : undefined;

  return (
    <WorkflowSelector
      selectedWorkflowId={workflowId}
      onWorkflowChange={handleWorkflowChange}
      config={{
        sortFunction: (workflows) =>
          workflows.sort((a, b) => {
            const aHasAlert = a.definition?.triggers?.some((t) => t.type === 'alert');
            const bHasAlert = b.definition?.triggers?.some((t) => t.type === 'alert');
            if (aHasAlert && !bHasAlert) return -1;
            if (!aHasAlert && bHasAlert) return 1;
            return 0;
          }),
      }}
      error={validationError}
      onCreateWorkflow={handleOpenWorkflowManagementApp}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default WorkflowsParamsFields;
