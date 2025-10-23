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
  EuiFormRow,
  EuiHighlight,
  EuiIcon,
  EuiInputPopover,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiSelectable,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useWorkflowSelection, type WorkflowOption } from './use_workflow_selection';

interface WorkflowSelectorProps {
  selectedWorkflowId?: string;
  onWorkflowChange: (workflowId: string) => void;
  filterFunction?: (workflow: any) => boolean; // eslint-disable-line @typescript-eslint/no-explicit-any
  sortFunction?: (a: any, b: any) => number; // eslint-disable-line @typescript-eslint/no-explicit-any
  label: string;
  placeholder: string;
  helpText?: string;
  error?: string;
  isInvalid?: boolean;
  createNewLinkText: string;
  noWorkflowsText: string;
  loadingText: string;
  failedToLoadText: string;
  workflowDisabledWarning: string;
  disabledBadgeLabel: string;
  selectedWorkflowDisabledError: string;
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

export const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({
  selectedWorkflowId,
  onWorkflowChange,
  filterFunction,
  sortFunction,
  label,
  placeholder,
  helpText,
  error,
  isInvalid,
  createNewLinkText,
  noWorkflowsText,
  loadingText,
  failedToLoadText,
  workflowDisabledWarning,
  disabledBadgeLabel,
  selectedWorkflowDisabledError,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(true);
  const { application } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  const {
    workflows,
    isLoading,
    loadError,
    selectedWorkflowDisabledError: hookSelectedWorkflowDisabledError,
    onWorkflowChange: hookOnWorkflowChange,
  } = useWorkflowSelection({
    filterFunction,
    sortFunction,
    selectedWorkflowId,
  });

  // Add prepend and append elements to workflow options
  const workflowsWithUI = workflows.map((workflow) => {
    let prependElement;
    if (workflow.wasSelectedButNowDisabled) {
      // Show warning icon for previously selected but now disabled workflows
      prependElement = (
        <EuiIcon type="alert" color="warning" aria-label={workflowDisabledWarning} />
      );
    } else if (workflow.isDisabled) {
      // Show disabled badge for disabled workflows
      prependElement = <EuiBadge color="default">{disabledBadgeLabel}</EuiBadge>;
    }

    return {
      ...workflow,
      prepend: prependElement,
      append: <TagsBadge tags={workflow.tags} />,
    };
  });

  // Custom render function for workflow options
  const renderWorkflowOption = useCallback((option: WorkflowOption, searchValue: string) => {
    return (
      <>
        <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        {option.data?.secondaryContent && (
          <EuiText size="xs" color="subdued" className="eui-displayBlock">
            <small>
              <EuiHighlight search={searchValue}>{option.data.secondaryContent}</EuiHighlight>
            </small>
          </EuiText>
        )}
      </>
    );
  }, []);

  const handleWorkflowChange = useCallback(
    (newOptions: WorkflowOption[], event: unknown, changedOption: WorkflowOption) => {
      hookOnWorkflowChange(newOptions, event, changedOption);
      setIsPopoverOpen(false);

      if (changedOption.checked === 'on') {
        onWorkflowChange(changedOption.id);
        setInputValue(changedOption.name);
        setIsSearching(false);
      } else {
        onWorkflowChange('');
        setInputValue('');
        setIsSearching(true);
      }
    },
    [hookOnWorkflowChange, onWorkflowChange]
  );

  const handlePopoverClose = useCallback(() => {
    setIsPopoverOpen(false);

    // If the user cleared the input but didn't select anything new,
    // revert to the currently selected workflow
    if (selectedWorkflowId && workflows.length > 0 && isSearching) {
      const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
      if (selectedWorkflow) {
        setInputValue(selectedWorkflow.name);
        setIsSearching(false);
      }
    }
  }, [selectedWorkflowId, workflows, isSearching]);

  const handleOpenWorkflowManagementApp = useCallback(() => {
    const url = application?.getUrlForApp
      ? application.getUrlForApp('workflows')
      : '/app/workflows';
    window.open(url, '_blank');
  }, [application]);

  // Update input value when workflowId changes
  useEffect(() => {
    if (selectedWorkflowId && workflows.length > 0) {
      const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
      if (selectedWorkflow) {
        setInputValue(selectedWorkflow.name);
        setIsSearching(false);
      }
    } else {
      setInputValue('');
      setIsSearching(true);
    }
  }, [selectedWorkflowId, workflows]);

  const workflowOptions =
    workflowsWithUI.length > 0
      ? workflowsWithUI
      : [
          {
            id: '',
            name: noWorkflowsText,
            description: '',
            status: '',
            label: noWorkflowsText,
            disabled: true,
          },
        ];

  const displayError = selectedWorkflowDisabledError || hookSelectedWorkflowDisabledError || error;
  const displayHelpText = loadError || (isLoading ? loadingText : helpText);

  return (
    <EuiFormRow
      label={label}
      labelAppend={
        <EuiLink onClick={handleOpenWorkflowManagementApp} external>
          {createNewLinkText} <EuiIcon type="plusInCircle" size="s" />
        </EuiLink>
      }
      helpText={displayHelpText}
      error={displayError}
      isInvalid={!!displayError || isInvalid}
      fullWidth
    >
      {isLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiSelectable
          aria-label="Select workflow"
          options={workflowOptions as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          onChange={handleWorkflowChange}
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
            placeholder,
          }}
          isPreFiltered={isSearching ? false : { highlightSearch: false }}
          data-test-subj="workflowIdSelect"
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
            </EuiInputPopover>
          )}
        </EuiSelectable>
      )}
    </EuiFormRow>
  );
};
