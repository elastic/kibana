/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { ManageData } from './manage_data';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { AppStatus, type ApplicationStart, type PublicAppInfo } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import type { FeatureCatalogueEntry } from '../../../services';

jest.mock('../app_navigation_handler', () => {
  return {
    createAppNavigationHandler: jest.fn(() => () => {}),
  };
});

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    share: { url: { locators: { get: () => ({ useUrl: () => '' }) } } },
    trackUiMetric: jest.fn(),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const createApplicationStartMock = ({
  isManagementEnabled,
  isDevToolsEnabled,
  managementAppStatus = AppStatus.accessible,
}: {
  isManagementEnabled: boolean;
  isDevToolsEnabled: boolean;
  managementAppStatus?: AppStatus;
}) =>
  ({
    capabilities: { navLinks: { management: isManagementEnabled, dev_tools: isDevToolsEnabled } },
    applications$: new BehaviorSubject(
      new Map<string, PublicAppInfo>([
        ['management', { status: managementAppStatus } as PublicAppInfo],
      ])
    ),
  } as unknown as ApplicationStart);

const applicationStartMock = createApplicationStartMock({
  isManagementEnabled: true,
  isDevToolsEnabled: true,
});

const applicationStartMockRestricted = createApplicationStartMock({
  isManagementEnabled: false,
  isDevToolsEnabled: false,
});

const applicationStartMockWithInaccessibleManagement = createApplicationStartMock({
  isManagementEnabled: true,
  isDevToolsEnabled: true,
  managementAppStatus: AppStatus.inaccessible,
});

const addBasePathMock = jest.fn((path: string) => (path ? path : 'path'));

const mockFeatures: FeatureCatalogueEntry[] = [
  {
    category: 'admin',
    description: 'Control who has access and what tasks they can perform.',
    icon: 'securityApp',
    id: 'security',
    order: 600,
    path: 'path-to-security-roles',
    title: 'Protect your data',
    showOnHomePage: true,
  },
  {
    category: 'admin',
    description: 'Track the real-time health and performance of your deployment.',
    icon: 'monitoringApp',
    id: 'monitoring',
    order: 610,
    path: 'path-to-monitoring',
    title: 'Monitor the stack',
    showOnHomePage: true,
  },
  {
    category: 'admin',
    description:
      'Save snapshots to a backup repository, and restore to recover index and cluster state.',
    icon: 'storage',
    id: 'snapshot_restore',
    order: 630,
    path: 'path-to-snapshot-restore',
    title: 'Store & recover backups',
    showOnHomePage: true,
  },
  {
    category: 'admin',
    description: 'Define lifecycle policies to automatically perform operations as an index ages.',
    icon: 'indexSettings',
    id: 'index_lifecycle_management',
    order: 640,
    path: 'path-to-index-lifecycle-management',
    title: 'Manage index lifecycles',
    showOnHomePage: true,
  },
];

describe('ManageData', () => {
  test('render', () => {
    const component = shallowWithIntl(
      <ManageData
        addBasePath={addBasePathMock}
        application={applicationStartMock}
        features={mockFeatures}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('render null without any features', () => {
    const component = shallowWithIntl(
      <ManageData addBasePath={addBasePathMock} application={applicationStartMock} features={[]} />
    );
    expect(component).toMatchSnapshot();
  });

  test('hide dev tools and stack management links if unavailable', () => {
    const component = shallowWithIntl(
      <ManageData
        addBasePath={addBasePathMock}
        application={applicationStartMockRestricted}
        features={mockFeatures}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders dev tools link when capability is enabled', () => {
    render(
      <EuiProvider>
        <I18nProvider>
          <ManageData
            addBasePath={addBasePathMock}
            application={applicationStartMock}
            features={mockFeatures}
          />
        </I18nProvider>
      </EuiProvider>
    );
    expect(screen.getByTestId('homeDevTools')).toBeInTheDocument();
  });

  test('renders stack management link when management app is accessible', async () => {
    render(
      <EuiProvider>
        <I18nProvider>
          <ManageData
            addBasePath={addBasePathMock}
            application={applicationStartMock}
            features={mockFeatures}
          />
        </I18nProvider>
      </EuiProvider>
    );

    expect(await screen.findByTestId('homeManage')).toBeInTheDocument();
  });

  test('does not render dev tools link when capability is disabled', () => {
    render(
      <EuiProvider>
        <I18nProvider>
          <ManageData
            addBasePath={addBasePathMock}
            application={applicationStartMockRestricted}
            features={mockFeatures}
          />
        </I18nProvider>
      </EuiProvider>
    );
    expect(screen.queryByTestId('homeDevTools')).not.toBeInTheDocument();
  });

  test('does not render stack management link when management app is inaccessible', async () => {
    render(
      <EuiProvider>
        <I18nProvider>
          <ManageData
            addBasePath={addBasePathMock}
            application={applicationStartMockWithInaccessibleManagement}
            features={mockFeatures}
          />
        </I18nProvider>
      </EuiProvider>
    );

    expect(screen.getByTestId('homeDevTools')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('homeManage')).not.toBeInTheDocument());
  });
});
