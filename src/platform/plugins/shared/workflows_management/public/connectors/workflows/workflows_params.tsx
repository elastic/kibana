/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { WorkflowListDto } from '@kbn/workflows';
import React, { useCallback, useEffect, useState } from 'react';
import * as i18n from './translations';
import type { WorkflowsActionParams } from './types';

interface WorkflowOption {
  value: string;
  inputDisplay: string;
  dropdownDisplay: React.ReactNode;
}

const WorkflowsParamsFields: React.FunctionComponent<ActionParamsProps<WorkflowsActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { workflowId } = actionParams.subActionParams ?? {};
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { http, application } = useKibana().services;

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

  const onWorkflowIdChange = useCallback(
    (selectedValue: string) => {
      editSubActionParams('workflowId', selectedValue);
    },
    [editSubActionParams]
  );

  const handleCreateNewWorkflow = useCallback(() => {
    const url = application?.getUrlForApp
      ? application.getUrlForApp('workflows')
      : '/app/workflows';
    window.open(url, '_blank');
  }, [application]);

  // Fetch workflows from internal Kibana API
  useEffect(() => {
    const fetchWorkflows = async () => {
      if (!http) {
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await http.post('/api/workflows/search');
        const workflowsMap = response as WorkflowListDto;

        const workflowOptions: WorkflowOption[] = workflowsMap.results.map((workflow) => ({
          value: workflow.id,
          inputDisplay: `${workflow.name} (${workflow.id})`,
          dropdownDisplay: (
            <div>
              <strong>{workflow.name}</strong>
              <br />
              <EuiText size="s" color="subdued">
                ID: {workflow.id}
              </EuiText>
            </div>
          ),
        }));

        setWorkflows(workflowOptions);
      } catch (error) {
        setLoadError(i18n.FAILED_TO_LOAD_WORKFLOWS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflows();
  }, [http]);

  const workflowOptions =
    workflows.length > 0
      ? workflows
      : [
          {
            value: '',
            inputDisplay: i18n.NO_WORKFLOWS_AVAILABLE,
            dropdownDisplay: i18n.NO_WORKFLOWS_AVAILABLE,
          },
        ];

  const errorMessages = errors['subActionParams.workflowId'];
  const errorMessage = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
  const displayError = typeof errorMessage === 'string' ? errorMessage : undefined;
  const helpText = loadError || (isLoading ? i18n.LOADING_WORKFLOWS : undefined);

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <span>{i18n.WORKFLOW_ID_LABEL}</span>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink onClick={handleCreateNewWorkflow} external>
            {/* Todo: add real icon from figma, doesn't exist in eui? */}
            {i18n.CREATE_NEW_WORKFLOW} <EuiIcon type="plusInCircle" size="s" />
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiSuperSelect
          fullWidth
          style={{ marginTop: '5px' }}
          options={workflowOptions}
          valueOfSelected={workflowId || ''}
          onChange={onWorkflowIdChange}
          data-test-subj="workflowIdSelect"
          placeholder={i18n.SELECT_WORKFLOW_PLACEHOLDER}
          isInvalid={displayError !== undefined}
          disabled={workflows.length === 0}
        />
      )}

      {(displayError || helpText) && (
        <EuiText size="s" color={displayError ? 'danger' : 'subdued'}>
          {displayError || helpText}
        </EuiText>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default WorkflowsParamsFields;
