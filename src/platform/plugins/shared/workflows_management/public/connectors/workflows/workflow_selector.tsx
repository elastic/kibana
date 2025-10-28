/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFormRow,
  EuiHighlight,
  EuiIcon,
  EuiInputPopover,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopoverFooter,
  EuiSelectable,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { WorkflowSelectorEmptyState } from './workflow_selector_empty_state';
import { getSelectedWorkflowDisabledError, processWorkflowsToOptions } from './workflow_utils';
import type { WorkflowOption, WorkflowSelectorConfig } from './workflow_utils';
import { useWorkflows } from '../../entities/workflows/model/use_workflows';

interface WorkflowSelectorProps {
  selectedWorkflowId?: string;
  onWorkflowChange: (workflowId: string) => void;
  config?: WorkflowSelectorConfig;
  error?: string;
  onCreateWorkflow?: () => void;
}

const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({
  selectedWorkflowId,
  onWorkflowChange,
  config = {},
  error,
  onCreateWorkflow,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(true);
  const { application } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  // Default configuration
  const defaultConfig: WorkflowSelectorConfig = useMemo(
    () => ({
      label: 'Select Workflow',
      placeholder: 'Select a workflow',
      createWorkflowLinkText: 'Create new',
      errorMessages: {
        selectedWorkflowDisabled: 'Selected workflow is disabled',
        loadFailed: 'Failed to load workflows',
      },
    }),
    []
  );

  const finalConfig = useMemo(() => ({ ...defaultConfig, ...config }), [defaultConfig, config]);

  // Fetch workflows using the hook
  const {
    data: workflowsData,
    isLoading,
    error: fetchError,
  } = useWorkflows({
    limit: 1000,
    page: 1,
    query: '',
  });

  // Process workflows using utility function
  const workflowOptions = useMemo(
    () => processWorkflowsToOptions(workflowsData?.results, selectedWorkflowId, finalConfig),
    [workflowsData?.results, selectedWorkflowId, finalConfig]
  );

  // Get selected workflow disabled error
  const selectedWorkflowDisabledError = useMemo(
    () =>
      getSelectedWorkflowDisabledError(
        workflowsData?.results,
        selectedWorkflowId,
        finalConfig.errorMessages?.selectedWorkflowDisabled
      ),
    [
      workflowsData?.results,
      selectedWorkflowId,
      finalConfig.errorMessages?.selectedWorkflowDisabled,
    ]
  );

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
      return <EuiToolTip content="Disabled workflow">{content}</EuiToolTip>;
    }

    return content;
  }, []);

  const handleWorkflowChange = useCallback(
    (newOptions: WorkflowOption[], event: unknown, changedOption: WorkflowOption) => {
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
    [onWorkflowChange]
  );

  const handlePopoverClose = useCallback(() => {
    setIsPopoverOpen(false);

    // If the user cleared the input but didn't select anything new,
    // revert to the currently selected workflow
    if (selectedWorkflowId && workflowOptions.length > 0 && isSearching) {
      const selectedWorkflow = workflowOptions.find((w) => w.id === selectedWorkflowId);
      if (selectedWorkflow) {
        setInputValue(selectedWorkflow.name);
        setIsSearching(false);
      }
    }
  }, [selectedWorkflowId, workflowOptions, isSearching]);

  const handleOpenWorkflowManagementApp = useCallback(() => {
    if (onCreateWorkflow) {
      onCreateWorkflow();
    } else {
      const url = application?.getUrlForApp
        ? application.getUrlForApp('workflows')
        : '/app/workflows';
      window.open(url, '_blank');
    }
  }, [application, onCreateWorkflow]);

  // Update input value when workflowId changes
  useEffect(() => {
    if (selectedWorkflowId && workflowOptions.length > 0) {
      const selectedWorkflow = workflowOptions.find((w) => w.id === selectedWorkflowId);
      if (selectedWorkflow) {
        setInputValue(selectedWorkflow.name);
        setIsSearching(false);
      }
    } else {
      setInputValue('');
      setIsSearching(true);
    }
  }, [selectedWorkflowId, workflowOptions]);

  // Prioritize selected workflow disabled error over validation errors
  const displayError = selectedWorkflowDisabledError || error;
  const helpText = fetchError
    ? finalConfig.errorMessages?.loadFailed
    : isLoading
    ? 'Loading workflows...'
    : undefined;

  return (
    <EuiFormRow
      label={finalConfig.label}
      labelAppend={
        <EuiLink onClick={handleOpenWorkflowManagementApp} external>
          {finalConfig.createWorkflowLinkText} <EuiIcon type="plusInCircle" size="s" />
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
            placeholder: finalConfig.placeholder,
          }}
          isPreFiltered={isSearching ? false : { highlightSearch: false }}
          data-test-subj="workflowSelector"
          emptyMessage={
            <WorkflowSelectorEmptyState onCreateWorkflow={handleOpenWorkflowManagementApp} />
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
              input={search!} // eslint-disable-line @typescript-eslint/no-non-null-assertion
              panelPaddingSize="none"
              fullWidth
            >
              {list}
              {workflowOptions.length > 0 && (
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

export { WorkflowSelector };
