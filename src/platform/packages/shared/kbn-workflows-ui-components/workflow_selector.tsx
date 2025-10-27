/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
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
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

// Keep the same interfaces as the original
export interface WorkflowOption {
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
  [key: string]: unknown;
}

// Keep the same props interface as the original
export interface WorkflowSelectorProps {
  workflows: WorkflowOption[];
  selectedWorkflowId?: string;
  onWorkflowChange: (workflowId: string) => void;
  label?: string;
  error?: string;
  helpText?: string;
  isInvalid?: boolean;
  isLoading?: boolean;
  loadError?: string;
  emptyStateComponent?: React.ComponentType<{ onCreateWorkflow: () => void }>;
  onCreateWorkflow?: () => void;
  placeholder?: string;
  'data-test-subj'?: string;
}

// Move the TagsBadge component exactly as-is
export const TagsBadge: React.FC<{ tags: string[] }> = ({ tags }) => {
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

// Generic empty state component for workflows
export const WorkflowsEmptyState: React.FC<{
  onCreateWorkflow: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
}> = ({
  onCreateWorkflow,
  title = "You don't have any workflows yet",
  description = 'Workflows help you automate and streamline tasks.',
  buttonText = 'Create your first workflow',
}) => {
  return (
    <EuiEmptyPrompt
      iconType="workflowsApp"
      title={<span>{title}</span>}
      body={<span>{description}</span>}
      actions={[
        <EuiButton
          key="create-workflow"
          onClick={onCreateWorkflow}
          iconType="plusInCircle"
          fill
        >
          {buttonText}
        </EuiButton>,
      ]}
    />
  );
};

// Move the renderWorkflowOption function exactly as-is
const renderWorkflowOption = (option: WorkflowOption, searchValue: string) => {
  const content = (
    <>
      <>
        {option.namePrepend}
        <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
      </>
      {option.data?.secondaryContent && (
        <EuiText size="xs" color="subdued" className="eui-displayBlock">
          <small>
            <EuiHighlight search={searchValue}>{option.data.secondaryContent}</EuiHighlight>
          </small>
        </EuiText>
      )}
    </>
  );

  if (option.disabled) {
    return <EuiToolTip content="This workflow is disabled">{content}</EuiToolTip>;
  }

  return content;
};

// Move the main WorkflowSelector component exactly as-is
export function WorkflowSelector({
  workflows,
  selectedWorkflowId,
  onWorkflowChange,
  label,
  error,
  helpText,
  isInvalid,
  isLoading = false,
  loadError,
  emptyStateComponent: EmptyStateComponent,
  onCreateWorkflow,
  placeholder = 'Select workflow',
  'data-test-subj': dataTestSubj = 'workflowSelector',
}: WorkflowSelectorProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(true);
  const { euiTheme } = useEuiTheme();

  const handleWorkflowChange = useCallback(
    (options: WorkflowOption[]) => {
      const selectedOption = options.find((option) => option.checked === 'on');
      if (selectedOption) {
        onWorkflowChange(selectedOption.id);
        setInputValue(selectedOption.name);
        setIsSearching(false);
      } else {
        onWorkflowChange('');
        setInputValue('');
        setIsSearching(true);
      }
    },
    [onWorkflowChange]
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
    if (onCreateWorkflow) {
      onCreateWorkflow();
    }
  }, [onCreateWorkflow]);

  // Update input value when selectedWorkflowId changes
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

  const workflowOptions = workflows;

  const displayError = error;
  const displayHelpText = loadError || (isLoading ? 'Loading workflows...' : helpText);

  return (
    <EuiFormRow
      label={label}
      labelAppend={
        onCreateWorkflow ? (
          <EuiLink onClick={handleOpenWorkflowManagementApp} external>
            Create new workflow <EuiIcon type="plusInCircle" size="s" />
          </EuiLink>
        ) : undefined
      }
      helpText={displayHelpText}
      error={displayError}
      isInvalid={!!displayError}
      fullWidth
    >
      {isLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiSelectable
          aria-label="Select workflow"
          options={workflowOptions as any}
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
          data-test-subj={dataTestSubj}
          emptyMessage={
            EmptyStateComponent ? (
              <EmptyStateComponent onCreateWorkflow={handleOpenWorkflowManagementApp} />
            ) : undefined
          }
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
              input={search || <div />}
              panelPaddingSize="none"
              fullWidth
            >
              {list}
              {workflows.length > 0 && onCreateWorkflow && (
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
}
