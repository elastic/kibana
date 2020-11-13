/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { ManageData } from './manage_data';
import { shallowWithIntl } from '@kbn/test/jest';
import { FeatureCatalogueCategory } from 'src/plugins/home/public';

const mockFeatures = [
  {
    category: FeatureCatalogueCategory.ADMIN,
    description: 'Control who has access and what tasks they can perform.',
    icon: 'securityApp',
    id: 'security',
    order: 600,
    path: 'path-to-security-roles',
    title: 'Protect your data',
    showOnHomePage: true,
  },
  {
    category: FeatureCatalogueCategory.ADMIN,
    description: 'Track the real-time health and performance of your deployment.',
    icon: 'monitoringApp',
    id: 'monitoring',
    order: 610,
    path: 'path-to-monitoring',
    title: 'Monitor the stack',
    showOnHomePage: true,
  },
  {
    category: FeatureCatalogueCategory.ADMIN,
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
    category: FeatureCatalogueCategory.ADMIN,
    description: 'Define lifecycle policies to automatically perform operations as an index ages.',
    icon: 'indexSettings',
    id: 'index_lifecycle_management',
    order: 640,
    path: 'path-to-index-lifecycle-management',
    title: 'Manage index lifecycles',
    showOnHomePage: true,
  },
];

const addBasePathMock = jest.fn((path: string) => (path ? path : 'path'));

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
