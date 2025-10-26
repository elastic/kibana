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
  EuiBadgeGroup,
  EuiButton,
  EuiEmptyPrompt,
  EuiFormRow,
  EuiHighlight,
  EuiIcon,
  EuiInputPopover,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiSelectable,
  EuiSelectableMessage,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowListDto } from '@kbn/workflows';
import * as i18n from './translations';
import type { WorkflowsActionParams } from './types';
import { IconDisabledWorkflow } from '../../assets/icons';

interface WorkflowOption {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  tags: string[];
  label: string;
  disabled?: boolean;
  checked?: 'on' | 'off';
  namePrepend?: React.ReactNode;
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  data?: {
    secondaryContent?: string;
  };
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const TagsBadge: React.FC<{ tags: string[] }> = ({ tags }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (tags.length === 0) {
    return null;
  }

  const handlePopoverToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setIsPopoverOpen(!isPopoverOpen);
  };

  return (
    <EuiPopover
      button={
        <EuiBadge
          color="hollow"
          iconType="tag"
          onClick={handlePopoverToggle}
          onClickAriaLabel="Show tags"
          style={{ cursor: 'pointer' }}
        >
          {tags.length}
        </EuiBadge>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downLeft"
    >
      <EuiBadgeGroup>
        {tags.map((tag) => (
          <EuiBadge key={tag} color="hollow" style={{ maxWidth: '150px' }}>
            {tag}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
    </EuiPopover>
  );
};

const WorkflowsEmptyState: React.FC<{ onCreateWorkflow: () => void }> = ({ onCreateWorkflow }) => {
  return (
    <EuiSelectableMessage>
      <EuiEmptyPrompt
        title={
          <EuiText textAlign="center" color="textParagraph">
            {i18n.EMPTY_STATE_TITLE}
          </EuiText>
        }
        titleSize="s"
        body={i18n.EMPTY_STATE_DESCRIPTION}
        actions={
          <EuiButton
            color="primary"
            fill={false}
            onClick={onCreateWorkflow}
            iconType="plusInCircle"
            size="s"
            disabled={false}
            isLoading={false}
          >
            {i18n.EMPTY_STATE_BUTTON_TEXT}
          </EuiButton>
        }
        paddingSize="l"
      />
    </EuiSelectableMessage>
  );
};

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
  const { euiTheme } = useEuiTheme();

  // Custom render function for workflow options
  const renderWorkflowOption = useCallback((option: WorkflowOption, searchValue: string) => {
    const content = (
      <>
        <>
          {option.namePrepend}
          <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        </>
        {option.secondaryContent && (
          <EuiText size="xs" color="subdued" className="eui-displayBlock">
            <small>
              <EuiHighlight search={searchValue}>{option.secondaryContent}</EuiHighlight>
            </small>
          </EuiText>
        )}
      </>
    );

    if (option.disabled) {
      return <EuiToolTip content={i18n.DISABLED_WORKFLOW_TOOLTIP}>{content}</EuiToolTip>;
    }

    return content;
  }, []);

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
    (newOptions: WorkflowOption[], event: unknown, changedOption: WorkflowOption) => {
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

  const handleOpenWorkflowManagementApp = useCallback(() => {
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
        const response = await http.post('/api/workflows/search', {
          body: JSON.stringify({
            limit: 1000,
            page: 1,
            query: '',
          }),
        });
        const workflowsMap = response as WorkflowListDto;

        // Check if the currently selected workflow is disabled
        let hasSelectedWorkflowDisabled = false;

        const workflowOptionsWithSortInfo = workflowsMap.results.map((workflow) => {
          // TODO: remove this once we have a way to disable workflows
          const isDisabled = !workflow.enabled;
          const isSelected = workflow.id === workflowId;
          const wasSelectedButNowDisabled = isSelected && isDisabled;
          const hasAlertTriggerType = (workflow.definition?.triggers ?? []).some(
            (trigger) => trigger.type === 'alert'
          );

          // Track if selected workflow is disabled
          if (wasSelectedButNowDisabled) {
            hasSelectedWorkflowDisabled = true;
          }

          // Determine what to show in prepend
          let prependNameElement;
          if (wasSelectedButNowDisabled) {
            // Show warning icon for previously selected but now disabled workflows
            prependNameElement = (
              <EuiIcon type="alert" color="warning" aria-label={i18n.WORKFLOW_DISABLED_WARNING} />
            );
          } else if (isDisabled) {
            // Show disabled icon for disabled workflows
            prependNameElement = (
              <IconDisabledWorkflow
                size="m"
                style={{ marginRight: '8px' }}
                aria-label={i18n.DISABLED_BADGE_LABEL}
              />
            );
          }

          const workflowTags = workflow.definition?.tags || [];

          return {
            workflowOption: {
              id: workflow.id,
              name: workflow.name,
              description: workflow.description,
              enabled: workflow.enabled,
              tags: workflowTags,
              label: workflow.name,
              disabled: isDisabled,
              checked: isSelected ? 'on' : undefined,
              namePrepend: prependNameElement,
              append: <TagsBadge tags={workflowTags} />,
              data: {
                secondaryContent: workflow.description || 'No description',
              },
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
  }, [http, workflowId]);

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

  const workflowOptions = workflows;

  const errorMessages = errors['subActionParams.workflowId'];
  const errorMessage = Array.isArray(errorMessages) ? errorMessages[0] : errorMessages;
  const validationError = typeof errorMessage === 'string' ? errorMessage : undefined;

  // Prioritize selected workflow disabled error over validation errors
  const displayError = selectedWorkflowDisabledError || validationError;
  const helpText = loadError || (isLoading ? i18n.LOADING_WORKFLOWS : undefined);

  return (
    <EuiFormRow
      label={i18n.WORKFLOW_ID_LABEL}
      labelAppend={
        <EuiLink onClick={handleOpenWorkflowManagementApp} external>
          {i18n.CREATE_NEW_WORKFLOW} <EuiIcon type="plusInCircle" size="s" />
        </EuiLink>
      }
      helpText={helpText}
      error={displayError}
      isInvalid={!!displayError}
      fullWidth
    >
      {isLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiSelectable
          aria-label="Select workflow"
          options={workflowOptions as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          onChange={onWorkflowChange}
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
          emptyMessage={<WorkflowsEmptyState onCreateWorkflow={handleOpenWorkflowManagementApp} />}
          listProps={{
            rowHeight: 60, // Increased height to accommodate secondary content and tags
            showIcons: false,
            css: {
              // Hide the badge when the option is focused
              // This should be configurable in EUI, but it's not :(
              '.euiSelectableListItem__onFocusBadge': {
                display: 'none',
              },
            },
          }}
          renderOption={renderWorkflowOption}
        >
          {(list, search) => (
            <EuiInputPopover
              closePopover={handlePopoverClose}
              disableFocusTrap
              closeOnScroll
              isOpen={isPopoverOpen}
              input={search!} // eslint-disable-line @typescript-eslint/no-non-null-assertion
              panelPaddingSize="none"
              fullWidth
            >
              {list}
              {workflows.length > 0 && (
                <EuiPopoverFooter
                  paddingSize="s"
                  css={{ backgroundColor: euiTheme.colors.backgroundBaseSubdued }}
                >
                  <EuiText size="s" textAlign="right">
                    <EuiLink onClick={handleOpenWorkflowManagementApp} external>
                      <FormattedMessage
                        id="workflows.params.viewAllWorkflowsLinkText"
                        defaultMessage="View all workflows"
                      />
                      <EuiIcon type="popout" size="s" />
                    </EuiLink>
                  </EuiText>
                </EuiPopoverFooter>
              )}
            </EuiInputPopover>
          )}
        </EuiSelectable>
      )}
    </EuiFormRow>
  );
};

// eslint-disable-next-line import/no-default-export
export default WorkflowsParamsFields;
