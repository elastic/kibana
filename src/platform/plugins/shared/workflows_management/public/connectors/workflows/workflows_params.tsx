/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  useWorkflows,
  type WorkflowOption,
  WorkflowSelector,
  WorkflowsEmptyState,
} from '@kbn/workflows-ui-components';
import * as i18n from './translations';
import type { WorkflowsActionParams } from './types';
import { IconDisabledWorkflow } from '../../assets/icons';

export function WorkflowsParamsFields({
  actionParams,
  editAction,
  index,
  errors,
}: ActionParamsProps<WorkflowsActionParams>) {
  const { workflowId } = actionParams.subActionParams ?? {};
  const [selectedWorkflowDisabledError, setSelectedWorkflowDisabledError] = useState<string | null>(
    null
  );
  const { http, application } = useKibana().services;

  // Use the shared hook
  const { workflows: rawWorkflows, isLoading, loadError } = useWorkflows(http);

  const handleOpenWorkflowManagementApp = useCallback(() => {
    const url = application?.getUrlForApp
      ? application.getUrlForApp('workflows')
      : '/app/workflows';
    window.open(url, '_blank');
  }, [application]);

  // Define sorting function for alert triggers
  const sortByAlertTriggers = React.useCallback((a: WorkflowOption, b: WorkflowOption) => {
    // Sort by alert trigger type
    const aHasAlert = (a.definition?.triggers ?? []).some(
      (trigger: { type: string }) => trigger.type === 'alert'
    );
    const bHasAlert = (b.definition?.triggers ?? []).some(
      (trigger: { type: string }) => trigger.type === 'alert'
    );
    if (aHasAlert && !bHasAlert) return -1;
    if (!aHasAlert && bHasAlert) return 1;
    return 0;
  }, []);

  // Process workflows with the same logic as before
  const workflows = React.useMemo(() => {
    return rawWorkflows.map((workflow) => {
      const isDisabled = !workflow.enabled;
      const isSelected = workflow.id === workflowId;
      const wasSelectedButNowDisabled = isSelected && isDisabled;

      // Track if selected workflow is disabled
      if (wasSelectedButNowDisabled) {
        setSelectedWorkflowDisabledError(i18n.SELECTED_WORKFLOW_DISABLED_ERROR);
      } else {
        setSelectedWorkflowDisabledError(null);
      }

      // Determine what to show in prepend
      let prependNameElement;
      if (wasSelectedButNowDisabled) {
        prependNameElement = (
          <EuiIcon type="alert" color="warning" aria-label={i18n.WORKFLOW_DISABLED_WARNING} />
        );
      } else if (isDisabled) {
        prependNameElement = (
          <IconDisabledWorkflow
            size="m"
            style={{ marginRight: '8px' }}
            aria-label={i18n.DISABLED_BADGE_LABEL}
          />
        );
      }

      return {
        ...workflow,
        disabled: isDisabled,
        checked: isSelected ? 'on' : undefined,
        namePrepend: prependNameElement,
      };
    });
  }, [rawWorkflows, workflowId]);

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

  const errorMessages = errors['subActionParams.workflowId'];
  const errorMessage = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
  const validationError = typeof errorMessage === 'string' ? errorMessage : undefined;

  // Prioritize selected workflow disabled error over validation errors
  const displayError = selectedWorkflowDisabledError || validationError;
  const helpText = loadError || (isLoading ? i18n.LOADING_WORKFLOWS : undefined);

  return (
    <WorkflowSelector
      workflows={workflows as WorkflowOption[]}
      selectedWorkflowId={workflowId}
      onWorkflowChange={(selectedWorkflowId: string) =>
        editSubActionParams('workflowId', selectedWorkflowId)
      }
      label={i18n.WORKFLOW_ID_LABEL}
      error={displayError ?? undefined}
      helpText={helpText}
      isInvalid={!!displayError}
      isLoading={isLoading}
      loadError={loadError ?? undefined}
      emptyStateComponent={(props) => (
        <WorkflowsEmptyState
          {...props}
          title={i18n.EMPTY_STATE_TITLE}
          description={i18n.EMPTY_STATE_DESCRIPTION}
          buttonText={i18n.EMPTY_STATE_BUTTON_TEXT}
        />
      )}
      onCreateWorkflow={handleOpenWorkflowManagementApp}
      placeholder={i18n.SELECT_WORKFLOW_PLACEHOLDER}
      data-test-subj="workflowIdSelect"
      sortWorkflows={sortByAlertTriggers}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default WorkflowsParamsFields;
