/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { I18nProviderMock } from '@kbn/core-i18n-browser-mocks/src/i18n_context_mock';
import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { WorkflowDetailHeaderProps } from './workflow_detail_header';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { mockUiSettingsService } from '../../../shared/mocks/mock_ui_settings_service';
import type { CoreStart } from '@kbn/core/public';

const services = {
  settings: {
    client: mockUiSettingsService(),
  },
} as unknown as CoreStart;

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
    canTestWorkflow: true,
    handleTestClick: () => {},
    isValid: true,
    hasUnsavedChanges: false,
    highlightDiff: false,
    setHighlightDiff: () => {},
    lastUpdatedAt: null,
  };

  const renderWithI18n = (component: React.ReactElement) => {
    return render(
      <MemoryRouter>
        <I18nProviderMock>
          <KibanaContextProvider services={services}>{component}</KibanaContextProvider>
        </I18nProviderMock>
      </MemoryRouter>
    );
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
});
