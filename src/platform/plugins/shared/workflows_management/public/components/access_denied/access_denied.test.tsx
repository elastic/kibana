/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { AccessDenied } from './access_denied';

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

jest.mock('../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs', () => ({
  useWorkflowsBreadcrumbs: jest.fn(),
}));

const renderWithProviders = (component: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider colorMode="light">{component}</EuiProvider>
    </I18nProvider>
  );

describe('AccessDenied', () => {
  it('renders no-read empty state copy and data-test-subj', () => {
    renderWithProviders(<AccessDenied />);

    expect(screen.getByTestId('workflowsNoReadAccessEmptyState')).toBeInTheDocument();
    expect(screen.getByText('Contact your administrator for access')).toBeInTheDocument();
    expect(
      screen.getByText('To view workflows in this space, you need additional privileges.')
    ).toBeInTheDocument();
  });

  it('lists required privileges in the empty prompt footer when requirements are provided', () => {
    renderWithProviders(<AccessDenied requirements={['Workflows: Read']} />);

    expect(
      screen.getByTestId('workflowsNoReadAccessRequiredPrivilegesSection')
    ).toBeInTheDocument();
    expect(screen.getByText('Minimum privileges required in this space:')).toBeInTheDocument();
    expect(screen.getByText('Workflows: Read')).toBeInTheDocument();
  });

  it('uses the light lock illustration in light mode', () => {
    renderWithProviders(<AccessDenied />);

    const image = screen.getByRole('img', { name: 'Restricted access' });
    expect(image).toHaveAttribute(
      'src',
      '/mock-base-path/plugins/workflowsManagement/assets/lock_light.svg'
    );
  });
});
