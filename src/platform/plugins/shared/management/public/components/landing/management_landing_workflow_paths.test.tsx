/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ManagementLandingWorkflowPaths } from './management_landing_workflow_paths';

function fullManagementCaps() {
  return {
    management: {
      data: {
        index_management: true,
        index_lifecycle_management: true,
        snapshot_restore: true,
      },
      ingest: { ingest_pipelines: true },
      insightsAndAlerting: { triggersActions: true, triggersActionsConnectors: true },
      security: { users: true, roles: true, api_keys: true },
    },
  } as any;
}

describe('ManagementLandingWorkflowPaths', () => {
  const navigateToApp = jest.fn();

  beforeEach(() => {
    navigateToApp.mockClear();
  });

  it('renders workflow rows when capabilities allow', () => {
    render(
      <I18nProvider>
        <ManagementLandingWorkflowPaths
          capabilities={fullManagementCaps()}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('managementLandingWorkflowPaths')).toBeInTheDocument();
    expect(
      screen.getByTestId('managementLandingWorkflowPathsFlow-setup_ingestion')
    ).toBeInTheDocument();
  });

  it('navigates to create user route when Add user link is clicked', () => {
    render(
      <I18nProvider>
        <ManagementLandingWorkflowPaths
          capabilities={fullManagementCaps()}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementLandingWorkflowPathsLink-access-add_user'));
    expect(navigateToApp).toHaveBeenCalledWith('management', {
      path: 'security/users/create',
    });
  });

  it('navigates to management when a link is clicked', () => {
    render(
      <I18nProvider>
        <ManagementLandingWorkflowPaths
          capabilities={fullManagementCaps()}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    fireEvent.click(
      screen.getByTestId('managementLandingWorkflowPathsLink-setup_ingestion-ingest_pipelines')
    );
    expect(navigateToApp).toHaveBeenCalledWith('management', {
      path: 'ingest/ingest_pipelines',
    });
  });

  it('returns null when no workflow links are permitted', () => {
    const { container } = render(
      <I18nProvider>
        <ManagementLandingWorkflowPaths capabilities={{} as any} navigateToApp={navigateToApp} />
      </I18nProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
