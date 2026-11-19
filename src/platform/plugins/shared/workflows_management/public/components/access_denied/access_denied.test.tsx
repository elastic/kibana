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

jest.mock('../../assets/lock_light.svg', () => 'lock_light.svg');

const renderWithProviders = (component: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider colorMode="light">{component}</EuiProvider>
    </I18nProvider>
  );

describe('AccessDenied', () => {
  it('renders the title, description, and data-test-subj', () => {
    renderWithProviders(
      <AccessDenied title="Access restricted" description="You need more privileges." />
    );

    expect(screen.getByTestId('workflowsAccessDeniedEmptyState')).toBeInTheDocument();
    expect(screen.getByText('Access restricted')).toBeInTheDocument();
    expect(screen.getByText('You need more privileges.')).toBeInTheDocument();
  });

  it('renders a footer when provided', () => {
    renderWithProviders(
      <AccessDenied
        title="Access restricted"
        description="You need more privileges."
        footer={<div data-test-subj="customFooter">{'Footer content'}</div>}
      />
    );

    expect(screen.getByTestId('customFooter')).toBeInTheDocument();
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    renderWithProviders(
      <AccessDenied
        title="Upgrade required"
        description="You need a higher license."
        actions={[
          <button key="upgrade" type="button">
            {'Upgrade'}
          </button>,
        ]}
      />
    );

    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  it('uses the light lock illustration in light mode', () => {
    renderWithProviders(
      <AccessDenied title="Access restricted" description="You need more privileges." />
    );

    const image = screen.getByRole('img', { name: 'Restricted access' });
    expect(image).toHaveAttribute('src', 'lock_light.svg');
  });
});
