/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInputPopover,
  EuiLink,
  EuiLoadingSpinner,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowListDto } from '@kbn/workflows';
import React, { useCallback, useEffect, useState } from 'react';
import * as i18n from './translations';
import type { WorkflowsActionParams } from './types';

interface WorkflowOption {
  id: string;
  name: string;
  description: string;
  status: string;
  label: string;
  disabled?: boolean;
  checked?: 'on' | 'off';
  toolTipContent?: string;
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  [key: string]: any;
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
  const [selectedWorkflowDisabledError, setSelectedWorkflowDisabledError] = useState<string | null>(
    null
  );
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(true);
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

  const onWorkflowChange = useCallback(
    (newOptions: WorkflowOption[], event: any, changedOption: WorkflowOption) => {
      setWorkflows(newOptions);
      setIsPopoverOpen(false);

      if (changedOption.checked === 'on') {
        editSubActionParams('workflowId', changedOption.id);
        setInputValue(changedOption.name);
        setIsSearching(false);
        // Clear the disabled workflow error when a new workflow is selected
        setSelectedWorkflowDisabledError(null);
      } else {
        editSubActionParams('workflowId', '');
        setInputValue('');
        setIsSearching(true);
        // Clear the disabled workflow error when selection is cleared
        setSelectedWorkflowDisabledError(null);
      }
    },
    [editSubActionParams]
  );

  const handlePopoverClose = useCallback(() => {
    setIsPopoverOpen(false);

    // If the user cleared the input but didn't select anything new,
    // revert to the currently selected workflow
    if (workflowId && workflows.length > 0 && isSearching) {
      const selectedWorkflow = workflows.find((w) => w.id === workflowId);
      if (selectedWorkflow) {
        setInputValue(selectedWorkflow.name);
        setIsSearching(false);
      }
    }
  }, [workflowId, workflows, isSearching]);

  const handleCreateNewWorkflow = useCallback(() => {
    const url = application?.getUrlForApp
      ? application.getUrlForApp('workflows')
      : '/app/workflows';
    window.open(url, '_blank');
  }, [application]);

  const handleOpenWorkflow = useCallback(
    (workflowIdToOpen: string, event: React.MouseEvent | React.KeyboardEvent) => {
      // Prevent the click from selecting the workflow option
      event.stopPropagation();
      event.preventDefault();
      event.nativeEvent.stopImmediatePropagation();

      const url = application?.getUrlForApp
        ? application.getUrlForApp('workflows', { path: `/${workflowIdToOpen}` })
        : `/app/workflows/${workflowIdToOpen}`;
      window.open(url, '_blank');
    },
    [application]
  );

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

        // Check if the currently selected workflow is disabled
        let hasSelectedWorkflowDisabled = false;

        const workflowOptionsWithSortInfo = workflowsMap.results.map((workflow) => {
          // TODO: remove this once we have a way to disable workflows
          const isDisabled = !workflow.definition.enabled;
          const isSelected = workflow.id === workflowId;
          const wasSelectedButNowDisabled = isSelected && isDisabled;
          const hasAlertTriggerType = workflow.definition?.triggers.some(
            (trigger) => trigger.type === 'alert'
          );

          // Track if selected workflow is disabled
          if (wasSelectedButNowDisabled) {
            hasSelectedWorkflowDisabled = true;
          }

          // Determine what to show in prepend
          let prependElement;
          if (wasSelectedButNowDisabled) {
            // Show warning icon for previously selected but now disabled workflows
            prependElement = (
              <EuiIcon type="alert" color="warning" aria-label={i18n.WORKFLOW_DISABLED_WARNING} />
            );
          } else if (isDisabled) {
            // Show disabled badge for disabled workflows
            prependElement = <EuiBadge color="default">{i18n.DISABLED_BADGE_LABEL}</EuiBadge>;
          }

          // Create the append element with the workflow link
          const appendElement = (
            <EuiButtonIcon
              iconType="popout"
              aria-label={i18n.OPEN_WORKFLOW_LINK}
              title={i18n.OPEN_WORKFLOW_LINK}
              size="s"
              color="text"
              style={{ flexShrink: 0 }}
              onMouseDown={(event: React.MouseEvent) => {
                event.stopPropagation();
                event.preventDefault();
                event.nativeEvent.stopImmediatePropagation();
              }}
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                event.preventDefault();
                event.nativeEvent.stopImmediatePropagation();
                handleOpenWorkflow(workflow.id, event);
              }}
            />
          );

          return {
            workflowOption: {
              id: workflow.id,
              name: workflow.name,
              description: workflow.description,
              status: workflow.status,
              label: workflow.name,
              disabled: isDisabled,
              checked: isSelected ? 'on' : undefined,
              toolTipContent: workflow.description,
              prepend: prependElement,
              append: appendElement,
            } as WorkflowOption,
            hasAlertTriggerType,
          };
        });

        // Sort workflows by hasAlertTriggerType: if they have an alert trigger type, they should be at the top
        const sortedWorkflowOptionsWithInfo = workflowOptionsWithSortInfo.sort((a, b) => {
          if (a.hasAlertTriggerType && !b.hasAlertTriggerType) return -1;
          if (!a.hasAlertTriggerType && b.hasAlertTriggerType) return 1;
          return 0;
        });

        // Extract just the workflow options for the component
        const workflowOptions = sortedWorkflowOptionsWithInfo.map((item) => item.workflowOption);

        // Set error state if selected workflow is disabled
        if (hasSelectedWorkflowDisabled) {
          setSelectedWorkflowDisabledError(i18n.SELECTED_WORKFLOW_DISABLED_ERROR);
        } else {
          setSelectedWorkflowDisabledError(null);
        }

        setWorkflows(workflowOptions);
      } catch (error) {
        setLoadError(i18n.FAILED_TO_LOAD_WORKFLOWS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflows();
  }, [http, workflowId, handleOpenWorkflow]);

  // Update input value when workflowId changes
  useEffect(() => {
    if (workflowId && workflows.length > 0) {
      const selectedWorkflow = workflows.find((w) => w.id === workflowId);
      if (selectedWorkflow) {
        setInputValue(selectedWorkflow.name);
        setIsSearching(false);
      }
    } else {
      setInputValue('');
      setIsSearching(true);
    }
  }, [workflowId, workflows]);

  const workflowOptions =
    workflows.length > 0
      ? workflows
      : [
          {
            id: '',
            name: i18n.NO_WORKFLOWS_AVAILABLE,
            description: '',
            status: '',
            label: i18n.NO_WORKFLOWS_AVAILABLE,
            disabled: true,
          },
        ];

  const errorMessages = errors['subActionParams.workflowId'];
  const errorMessage = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
  const validationError = typeof errorMessage === 'string' ? errorMessage : undefined;

  // Prioritize selected workflow disabled error over validation errors
  const displayError = selectedWorkflowDisabledError || validationError;
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
        <EuiSelectable
          aria-label="Select workflow"
          options={workflowOptions as any}
          onChange={onWorkflowChange as any}
          singleSelection
          searchable
          searchProps={{
            value: inputValue,
            onChange: (value) => {
              setInputValue(value);
              setIsSearching(true);
            },
            onKeyDown: (event) => {
              if (event.key === 'Tab') return handlePopoverClose();
              if (event.key === 'Escape') return handlePopoverClose();
              if (event.key !== 'Escape') return setIsPopoverOpen(true);
            },
            onClick: () => setIsPopoverOpen(true),
            onFocus: () => setIsPopoverOpen(true),
            placeholder: i18n.SELECT_WORKFLOW_PLACEHOLDER,
          }}
          isPreFiltered={isSearching ? false : { highlightSearch: false }}
          data-test-subj="workflowIdSelect"
          listProps={{
            rowHeight: 40,
          }}
        >
          {(list, search) => (
            <EuiInputPopover
              closePopover={handlePopoverClose}
              disableFocusTrap
              closeOnScroll
              isOpen={isPopoverOpen}
              input={search!}
              panelPaddingSize="none"
              fullWidth
            >
              {list}
            </EuiInputPopover>
          )}
        </EuiSelectable>
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
