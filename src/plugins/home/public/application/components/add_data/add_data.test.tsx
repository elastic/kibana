/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { AddData } from './add_data';
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
    category: 'data',
    description: 'Ingest data from popular apps and services.',
    showOnHomePage: true,
    icon: 'indexOpen',
    id: 'home_tutorial_directory',
    order: 500,
    path: '/app/home#/tutorial_directory',
    title: 'Ingest data',
  },
  {
    category: 'admin',
    description: 'Add and manage your fleet of Elastic Agents and integrations.',
    showOnHomePage: true,
    icon: 'indexManagementApp',
    id: 'ingestManager',
    order: 510,
    path: '/app/ingestManager',
    title: 'Add Elastic Agent',
  },
  {
    category: 'data',
    description: 'Import your own CSV, NDJSON, or log file',
    showOnHomePage: true,
    icon: 'document',
    id: 'ml_file_data_visualizer',
    order: 520,
    path: '/app/ml#/filedatavisualizer',
    title: 'Upload a file',
  },
];

describe('AddData', () => {
  test('render', () => {
    const component = shallowWithIntl(
      <AddData addBasePath={addBasePathMock} features={mockFeatures} />
    );
    expect(component).toMatchSnapshot();
  });
});
