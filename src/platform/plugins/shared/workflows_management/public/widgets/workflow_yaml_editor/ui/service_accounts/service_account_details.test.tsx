/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render as renderComponent, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ServiceAccountDetails } from './service_account_details';

const render = (component: React.ReactElement) =>
  renderComponent(component, { wrapper: I18nProvider });

const account = {
  id: 'opaque-id',
  name: 'Investigation reader',
  roles: ['viewer', 'custom_reader'],
  enabled: true,
  assumable: true,
};

describe('ServiceAccountDetails', () => {
  it('shows role badges and the deployment without the confusing scope or assumable labels', () => {
    const { container } = render(
      <ServiceAccountDetails account={account} environment={{ isServerless: false }} />
    );
    expect(screen.getByText('viewer')).toBeInTheDocument();
    expect(screen.getByText('custom_reader')).toBeInTheDocument();
    expect(screen.getByText('This deployment')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="logoKibana"]')).toBeInTheDocument();
    expect(screen.queryByText(/Role scope|Kibana can assume/)).not.toBeInTheDocument();
    expect(screen.queryByText('This account cannot run workflows.')).not.toBeInTheDocument();
  });

  it.each([
    ['security', 'logoSecurity'],
    ['observability', 'logoObservability'],
    ['search', 'logoElasticsearch'],
  ])('shows the current %s project and its icon', (projectType, icon) => {
    const { container } = render(
      <ServiceAccountDetails
        account={account}
        environment={{
          isServerless: true,
          projectType,
          projectName: 'Investigation project',
          projectId: 'project123',
        }}
      />
    );
    expect(screen.getByText('Investigation project')).toHaveAttribute('title', 'project123');
    expect(container.querySelector(`[data-euiicon-type="${icon}"]`)).toBeInTheDocument();
    expect(screen.queryByText('This deployment')).not.toBeInTheDocument();
  });

  it('does not invent project metadata when unavailable', () => {
    render(<ServiceAccountDetails account={account} environment={{ isServerless: true }} />);
    expect(screen.getByText('Current project')).not.toHaveAttribute('title');
  });

  it.each([
    { enabled: false, assumable: true },
    { enabled: true, assumable: false },
    { enabled: false, assumable: false },
  ])('explains unavailable accounts and missing roles (%j)', (availability) => {
    render(
      <ServiceAccountDetails
        account={{ ...account, ...availability, roles: [] }}
        environment={{ isServerless: false }}
      />
    );
    expect(screen.getByText(availability.enabled ? 'Enabled' : 'Disabled')).toBeInTheDocument();
    expect(screen.getByText('No roles assigned')).toBeInTheDocument();
    expect(screen.getByText('This account cannot run workflows.')).toBeInTheDocument();
  });

  it('renders directory and project values as plain text', () => {
    const { container } = render(
      <ServiceAccountDetails
        account={{ ...account, name: '<script>run()</script>', roles: ['[admin](command:run)'] }}
        environment={{ isServerless: true, projectName: '<project>' }}
      />
    );
    expect(screen.getByText('<script>run()</script>')).toBeInTheDocument();
    expect(screen.getByText('[admin](command:run)')).toBeInTheDocument();
    expect(screen.getByText('<project>')).toBeInTheDocument();
    expect(container.querySelector('script, a')).not.toBeInTheDocument();
  });
});
