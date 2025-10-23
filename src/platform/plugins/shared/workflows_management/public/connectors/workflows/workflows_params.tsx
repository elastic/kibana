/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';
import type { WorkflowsActionParams } from './types';
import { WorkflowSelector } from '../../components';

const WorkflowsParamsFields: React.FunctionComponent<ActionParamsProps<WorkflowsActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { workflowId } = actionParams.subActionParams ?? {};

  // Ensure proper initialization of action parameters
  useEffect(() => {
    if (!actionParams?.subAction) {
      editAction('subAction', 'run', index);
    }
    if (!actionParams?.subActionParams) {
      editAction('subActionParams', { workflowId: '' }, index);
    }
  }, [actionParams, editAction, index]);

  const editSubActionParams = useCallback(
    (key: string, value: unknown) => {
      const oldParams = actionParams.subActionParams ?? {};
      const updatedParams = { ...oldParams, [key]: value };
      editAction('subActionParams', updatedParams, index);
    },
    [actionParams.subActionParams, editAction, index]
  );

  const onWorkflowChange = useCallback(
    (newWorkflowId: string) => {
      editSubActionParams('workflowId', newWorkflowId);
    },
    [editSubActionParams]
  );

  // Alert-specific filter function
  const filterFunction = useCallback(
    (workflow: { definition?: { triggers?: Array<{ type: string }> } }) => {
      const hasAlertTriggerType = (workflow.definition?.triggers ?? []).some(
        (trigger) => trigger.type === 'alert'
      );
      return hasAlertTriggerType;
    },
    []
  );

  // Alert-specific sort function
  const sortFunction = useCallback(
    (
      a: { definition?: { triggers?: Array<{ type: string }> } },
      b: { definition?: { triggers?: Array<{ type: string }> } }
    ) => {
      const aHasAlertTrigger = (a.definition?.triggers ?? []).some(
        (trigger) => trigger.type === 'alert'
      );
      const bHasAlertTrigger = (b.definition?.triggers ?? []).some(
        (trigger) => trigger.type === 'alert'
      );

      if (aHasAlertTrigger && !bHasAlertTrigger) return -1;
      if (!aHasAlertTrigger && bHasAlertTrigger) return 1;
      return 0;
    },
    []
  );

  const errorMessages = errors['subActionParams.workflowId'];
  const errorMessage = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
  const validationError = typeof errorMessage === 'string' ? errorMessage : undefined;

  return (
    <WorkflowSelector
      selectedWorkflowId={workflowId}
      onWorkflowChange={onWorkflowChange}
      filterFunction={filterFunction}
      sortFunction={sortFunction}
      label={i18n.WORKFLOW_ID_LABEL}
      placeholder={i18n.SELECT_WORKFLOW_PLACEHOLDER}
      error={validationError}
      isInvalid={!!validationError}
      createNewLinkText={i18n.CREATE_NEW_WORKFLOW}
      noWorkflowsText={i18n.NO_WORKFLOWS_AVAILABLE}
      loadingText={i18n.LOADING_WORKFLOWS}
      failedToLoadText={i18n.FAILED_TO_LOAD_WORKFLOWS}
      workflowDisabledWarning={i18n.WORKFLOW_DISABLED_WARNING}
      disabledBadgeLabel={i18n.DISABLED_BADGE_LABEL}
      selectedWorkflowDisabledError={i18n.SELECTED_WORKFLOW_DISABLED_ERROR}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default WorkflowsParamsFields;
