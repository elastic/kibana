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
});
