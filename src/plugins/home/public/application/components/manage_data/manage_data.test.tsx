/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { ManageData } from './manage_data';
import { shallowWithIntl } from '@kbn/test/jest';

jest.mock('../app_navigation_handler', () => {
  return {
    createAppNavigationHandler: jest.fn(() => () => {}),
  };
});

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    trackUiMetric: jest.fn(),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const addBasePathMock = jest.fn((path: string) => (path ? path : 'path'));

const mockFeatures = [
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
      <ManageData addBasePath={addBasePathMock} features={mockFeatures} />
    );
    expect(component).toMatchSnapshot();
  });

  test('render empty without any features', () => {
    const component = shallowWithIntl(<ManageData addBasePath={addBasePathMock} features={[]} />);
    expect(component).toMatchSnapshot();
  });
});
