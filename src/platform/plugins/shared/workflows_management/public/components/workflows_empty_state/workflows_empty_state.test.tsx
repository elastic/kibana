/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useLibraryEnabled } from '@kbn/workflows-ui';
import { WorkflowsEmptyState, WorkflowsEmptyStateReadOnly } from './workflows_empty_state';
import { TestProvider } from '../../shared/mocks/test_providers';

const mockNavigateToApp = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        basePath: {
          prepend: (path: string) => `/mock-base-path${path}`,
        },
      },
      application: { navigateToApp: mockNavigateToApp },
    },
  }),
}));

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useLibraryEnabled: jest.fn(),
}));

const mockUseLibraryEnabled = jest.mocked(useLibraryEnabled);

const renderWithProviders = (component: React.ReactElement) =>
  render(<TestProvider>{component}</TestProvider>);

describe('WorkflowsEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLibraryEnabled.mockReturnValue(false);
  });

  it('renders the empty state with title and description', () => {
    renderWithProviders(<WorkflowsEmptyState />);

    expect(screen.getByText('Get Started with Workflows')).toBeInTheDocument();
    expect(screen.getByText(/Workflows let you automate repetitive tasks/)).toBeInTheDocument();
  });

  it('renders the create button when onCreateWorkflow is provided', () => {
    const onCreateWorkflow = jest.fn();
    renderWithProviders(<WorkflowsEmptyState onCreateWorkflow={onCreateWorkflow} />);

    const createButton = screen.getByText('Create workflow');
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);
    expect(onCreateWorkflow).toHaveBeenCalledTimes(1);
  });

  it('does not render the create button when onCreateWorkflow is not provided', () => {
    renderWithProviders(<WorkflowsEmptyState />);

    expect(screen.queryByText('Create workflow')).not.toBeInTheDocument();
  });

  it('renders the footer with documentation link', () => {
    renderWithProviders(<WorkflowsEmptyState />);

    expect(screen.getByText('Need help?')).toBeInTheDocument();
    expect(screen.getByText('Read documentation')).toBeInTheDocument();
  });

  it('renders the illustration image', () => {
    renderWithProviders(<WorkflowsEmptyState />);

    const images = screen.getAllByRole('presentation');
    const mainImage = images.find((img) => img.tagName === 'IMG');
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute(
      'src',
      '/mock-base-path/plugins/workflowsManagement/assets/empty_state.svg'
    );
  });

  it('renders the "Example workflows" GitHub link when the library is disabled', () => {
    renderWithProviders(<WorkflowsEmptyState onCreateWorkflow={jest.fn()} />);

    const link = screen.getByText('Example workflows').closest('a');
    expect(link).toHaveAttribute('href', 'https://github.com/elastic/workflows');
    expect(screen.queryByText('Explore library')).not.toBeInTheDocument();
  });

  it('renders an "Explore library" button that navigates to the library when enabled', () => {
    mockUseLibraryEnabled.mockReturnValue(true);
    renderWithProviders(<WorkflowsEmptyState onCreateWorkflow={jest.fn()} />);

    expect(screen.queryByText('Example workflows')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Explore library'));

    expect(mockNavigateToApp).toHaveBeenCalledWith('workflows', { deepLinkId: 'library' });
  });
});

describe('WorkflowsEmptyStateReadOnly', () => {
  it('renders the read-only empty state with title and description', () => {
    renderWithProviders(<WorkflowsEmptyStateReadOnly />);

    expect(screen.getByText('Workflows list will be here')).toBeInTheDocument();
    expect(screen.getByText(/Workflows let you automate repetitive tasks/)).toBeInTheDocument();
  });

  it('does not render create workflow actions', () => {
    renderWithProviders(<WorkflowsEmptyStateReadOnly />);

    expect(screen.queryByText('Create workflow')).not.toBeInTheDocument();
    expect(screen.queryByText('Example workflows')).not.toBeInTheDocument();
    expect(screen.queryByText('Need help?')).not.toBeInTheDocument();
  });

  it('shows the required write privilege in the footer', () => {
    renderWithProviders(<WorkflowsEmptyStateReadOnly />);

    expect(screen.getByText('Minimum privileges required:')).toBeInTheDocument();
    expect(screen.getByText('Workflows: Write')).toBeInTheDocument();
  });
});
