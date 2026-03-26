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
import { I18nProvider } from '@kbn/i18n-react';
import { WorkflowsEmptyState } from './workflows_empty_state';

// Mock useKibana hook
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: {
        basePath: {
          prepend: (path: string) => `/mock-base-path${path}`,
        },
      },
    },
  }),
}));

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('WorkflowsEmptyState', () => {
  it('renders the empty state with title and description', () => {
    renderWithIntl(<WorkflowsEmptyState />);

    expect(screen.getByText('Get Started with Workflows')).toBeInTheDocument();
    expect(screen.getByText(/Workflows let you automate repetitive tasks/)).toBeInTheDocument();
  });

  it('renders the create button when user can create workflows', () => {
    const onCreateWorkflow = jest.fn();
    renderWithIntl(
      <WorkflowsEmptyState canCreateWorkflow={true} onCreateWorkflow={onCreateWorkflow} />
    );

    const createButton = screen.getByText('Create a new workflow');
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);
    expect(onCreateWorkflow).toHaveBeenCalledTimes(1);
  });

  it('does not render the create button when user cannot create workflows', () => {
    renderWithIntl(<WorkflowsEmptyState canCreateWorkflow={false} />);

    expect(screen.queryByText('Create a new workflow')).not.toBeInTheDocument();
  });

  it('does not render the create button when onCreateWorkflow is not provided', () => {
    renderWithIntl(<WorkflowsEmptyState canCreateWorkflow={true} />);

    expect(screen.queryByText('Create a new workflow')).not.toBeInTheDocument();
  });

  it('renders the footer with documentation link', () => {
    renderWithIntl(<WorkflowsEmptyState />);

    expect(screen.getByText('Need help?')).toBeInTheDocument();
    expect(screen.getByText('Read documentation')).toBeInTheDocument();
  });

  it('renders the illustration image', () => {
    renderWithIntl(<WorkflowsEmptyState />);

    const images = screen.getAllByRole('presentation');
    const mainImage = images.find((img) => img.tagName === 'IMG');
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute(
      'src',
      '/mock-base-path/plugins/workflowsManagement/assets/empty_state.svg'
    );
  });
});
