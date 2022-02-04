/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { AddData } from './add_data';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { FeatureCatalogueCategory } from 'src/plugins/home/public';

const mockFeatures = [
  {
    category: FeatureCatalogueCategory.DATA,
    description: 'Ingest data from popular apps and services.',
    showOnHomePage: true,
    icon: 'indexOpen',
    id: 'home_tutorial_directory',
    order: 500,
    path: '/app/home#/tutorial_directory',
    title: 'Ingest data',
  },
  {
    category: FeatureCatalogueCategory.ADMIN,
    description: 'Add and manage your fleet of Elastic Agents and integrations.',
    showOnHomePage: true,
    icon: 'indexManagementApp',
    id: 'ingestManager',
    order: 510,
    path: '/app/ingestManager',
    title: 'Add Elastic Agent',
  },
  {
    category: FeatureCatalogueCategory.DATA,
    description: 'Import your own CSV, NDJSON, or log file',
    showOnHomePage: true,
    icon: 'document',
    id: 'ml_file_data_visualizer',
    order: 520,
    path: '/app/ml#/filedatavisualizer',
    title: 'Upload a file',
  },
];

jest.mock('../../lib/ui_metric', () => ({
  trackUiMetric: jest.fn(),
}));

const addBasePathMock = jest.fn((path: string) => (path ? path : 'path'));

describe('AddData', () => {
  test('render', () => {
    const component = shallowWithIntl(
      <AddData addBasePath={addBasePathMock} features={mockFeatures} />
    );
    expect(component).toMatchSnapshot();
  });
});
