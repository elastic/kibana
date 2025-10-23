/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { WorkflowDetailHeaderProps } from './workflow_detail_header';
import { WorkflowDetailHeader } from './workflow_detail_header';

jest.mock('../../../hooks/use_kibana');
jest.mock('react-redux', () => ({
  useSelector: jest.fn((fn) => fn()),
}));
const mockSelectIsYamlSyntaxValid = jest.fn(() => true);
jest.mock('../../../widgets/workflow_yaml_editor/lib/store/selectors', () => ({
  selectIsYamlSyntaxValid: () => mockSelectIsYamlSyntaxValid(),
}));

const renderWithI18n = (component: React.ReactElement) => {
  return render(component, { wrapper: I18nProvider });
};

describe('WorkflowDetailHeader', () => {
  const defaultProps: WorkflowDetailHeaderProps = {
    isCreateMode: false,
    name: 'WorkflowDetailHeader',
    isLoading: false,
    activeTab: 'workflow',
    handleTabChange: () => {},
    canRunWorkflow: true,
    handleRunClick: () => {},
    canSaveWorkflow: true,
    handleSave: () => {},
    isEnabled: true,
    handleToggleWorkflow: () => {},
    hasUnsavedChanges: false,
    highlightDiff: false,
    setHighlightDiff: () => {},
    lastUpdatedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render', () => {
    const { getByText } = renderWithI18n(<WorkflowDetailHeader {...defaultProps} />);
    expect(getByText('WorkflowDetailHeader')).toBeInTheDocument();
  });

  it('shows saved status when no changes', () => {
    const { getByText } = renderWithI18n(<WorkflowDetailHeader {...defaultProps} />);
    expect(getByText('Saved')).toBeInTheDocument();
  });

  it('shows unsaved changes when there are changes', () => {
    const { getByText } = renderWithI18n(
      <WorkflowDetailHeader {...defaultProps} hasUnsavedChanges={true} />
    );
    expect(getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('shows run workflow tooltip when yaml is invalid', () => {
    mockSelectIsYamlSyntaxValid.mockReturnValue(false);
    const result = renderWithI18n(<WorkflowDetailHeader {...defaultProps} />);
    expect(result.getByTestId('runWorkflowHeaderButton')).toBeDisabled();
  });

  it('shows run workflow tooltip when yaml is valid', () => {
    mockSelectIsYamlSyntaxValid.mockReturnValue(true);
    const result = renderWithI18n(<WorkflowDetailHeader {...defaultProps} />);
    expect(result.getByTestId('runWorkflowHeaderButton')).toBeEnabled();
  });

  describe('Create Mode', () => {
    const createModeProps: WorkflowDetailHeaderProps = {
      ...defaultProps,
      isCreateMode: true,
      name: 'New workflow',
      isEnabled: false, // New workflows start disabled
      lastUpdatedAt: null, // No last updated time for new workflows
    };

    it('should render in create mode', () => {
      const { getByText } = renderWithI18n(<WorkflowDetailHeader {...createModeProps} />);
      expect(getByText('New workflow')).toBeInTheDocument();
    });

    it('should not show last updated time in create mode', () => {
      const { queryByText } = renderWithI18n(<WorkflowDetailHeader {...createModeProps} />);
      expect(queryByText(/Last updated/)).not.toBeInTheDocument();
    });

    it('should show unsaved changes badge when there are changes in create mode', () => {
      const { getByText } = renderWithI18n(
        <WorkflowDetailHeader {...createModeProps} hasUnsavedChanges={true} />
      );
      expect(getByText('Unsaved changes')).toBeInTheDocument();
    });

    it('should disable run button when workflow is not enabled in create mode', () => {
      const { getByLabelText } = renderWithI18n(<WorkflowDetailHeader {...createModeProps} />);
      const runButton = getByLabelText('Run workflow');
      expect(runButton).toBeDisabled();
    });

    it('should show save button in create mode', () => {
      const { getByText } = renderWithI18n(<WorkflowDetailHeader {...createModeProps} />);
      expect(getByText('Save')).toBeInTheDocument();
    });

    it('should disable save button when cannot save in create mode', () => {
      const { getByRole } = renderWithI18n(
        <WorkflowDetailHeader {...createModeProps} canSaveWorkflow={false} />
      );
      const saveButton = getByRole('button', { name: /Save/i });
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when can save in create mode', () => {
      const { getByText } = renderWithI18n(<WorkflowDetailHeader {...createModeProps} />);
      const saveButton = getByText('Save');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Edit Mode', () => {
    const editModeProps: WorkflowDetailHeaderProps = {
      ...defaultProps,
      isCreateMode: false,
      name: 'Existing Workflow',
      isEnabled: true,
      lastUpdatedAt: new Date('2024-01-01T10:00:00Z'),
    };

    it('should render in edit mode', () => {
      const { getByText } = renderWithI18n(<WorkflowDetailHeader {...editModeProps} />);
      expect(getByText('Existing Workflow')).toBeInTheDocument();
    });

    it('should show last updated time in edit mode', () => {
      const { getByText } = renderWithI18n(<WorkflowDetailHeader {...editModeProps} />);
      // The component shows relative time like "1 yr. ago"
      expect(getByText(/ago/)).toBeInTheDocument();
    });

    it('should show toggle switch in edit mode', () => {
      const { getByRole } = renderWithI18n(<WorkflowDetailHeader {...editModeProps} />);
      const toggleSwitch = getByRole('switch');
      expect(toggleSwitch).toBeInTheDocument();
    });

    it('should show toggle switch as checked when workflow is enabled', () => {
      const { getByRole } = renderWithI18n(<WorkflowDetailHeader {...editModeProps} />);
      const toggleSwitch = getByRole('switch');
      expect(toggleSwitch).toBeChecked();
    });

    it('should show toggle switch as unchecked when workflow is disabled', () => {
      const { getByRole } = renderWithI18n(
        <WorkflowDetailHeader {...editModeProps} isEnabled={false} />
      );
      const toggleSwitch = getByRole('switch');
      expect(toggleSwitch).not.toBeChecked();
    });
  });

  describe('Run Button Behavior', () => {
    it('should show confirmation dialog when running with unsaved changes in edit mode', async () => {
      const handleRunClick = jest.fn();
      const { getByLabelText, findByText } = renderWithI18n(
        <WorkflowDetailHeader
          {...defaultProps}
          isCreateMode={false}
          hasUnsavedChanges={true}
          handleRunClick={handleRunClick}
        />
      );

      const runButton = getByLabelText('Run workflow');
      runButton.click();

      // Should show confirmation dialog instead of calling handleRunClick directly
      expect(handleRunClick).not.toHaveBeenCalled();
      const dialog = await findByText('Run workflow with unsaved changes?');
      expect(dialog).toBeInTheDocument();
    });

    it('should run directly when no unsaved changes in edit mode', () => {
      const handleRunClick = jest.fn();
      const { getByLabelText } = renderWithI18n(
        <WorkflowDetailHeader
          {...defaultProps}
          isCreateMode={false}
          hasUnsavedChanges={false}
          handleRunClick={handleRunClick}
        />
      );

      const runButton = getByLabelText('Run workflow');
      runButton.click();

      expect(handleRunClick).toHaveBeenCalled();
    });
  });
});
