/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { GettingStarted } from './getting_started';
import { shallowWithIntl } from '@kbn/test/jest';
import { FeatureCatalogueCategory } from 'src/plugins/home/public';

const addBasePathMock = jest.fn((path: string) => (path ? path : 'path'));

const mockApps = [
  {
    category: FeatureCatalogueCategory.DATA,
    description: 'Display and share a collection of visualizations and saved searches.',
    icon: 'dashboardApp',
    id: 'dashboard',
    order: 100,
    path: 'path-to-dashboard',
    showOnHomePage: false,
    solutionId: 'kibana',
    subtitle: 'Analyze data in dashboards.',
    title: 'Dashboard',
  },
  {
    category: FeatureCatalogueCategory.DATA,
    description: 'Interactively explore your data by querying and filtering raw documents.',
    icon: 'discoverApp',
    id: 'discover',
    order: 200,
    path: 'path-to-discover',

    showOnHomePage: false,
    solutionId: 'kibana',
    subtitle: 'Search and find insights.',
    title: 'Discover',
  },
  {
    category: FeatureCatalogueCategory.DATA,
    description: 'Showcase your data in a pixel-perfect way.',
    icon: 'canvasApp',
    id: 'canvas',
    order: 300,
    path: 'path-to-canvas',

    showOnHomePage: false,
    solutionId: 'kibana',
    subtitle: 'Design pixel-perfect reports.',
    title: 'Canvas',
  },
  {
    category: FeatureCatalogueCategory.DATA,
    description: 'Explore geospatial data from Elasticsearch and the Elastic Maps Service.',
    icon: 'gisApp',
    id: 'maps',
    order: 400,
    path: 'path-to-maps',
    showOnHomePage: false,
    solutionId: 'kibana',
    subtitle: 'Plot geographic data.',
    title: 'Maps',
  },
  {
    category: FeatureCatalogueCategory.DATA,
    description:
      'Automatically model the normal behavior of your time series data to detect anomalies.',
    icon: 'machineLearningApp',
    id: 'ml',
    order: 500,
    path: 'path-to-ml',
    showOnHomePage: false,
    solutionId: 'kibana',
    subtitle: 'Model, predict, and detect.',
    title: 'Machine Learning',
  },
  {
    category: FeatureCatalogueCategory.DATA,
    description: 'Surface and analyze relevant relationships in your Elasticsearch data.',
    icon: 'graphApp',
    id: 'graph',
    order: 600,
    path: 'path-to-graph',
    showOnHomePage: false,
    solutionId: 'kibana',
    subtitle: 'Reveal patterns and relationships.',
    title: 'Graph',
  },
];

describe('GettingStarted', () => {
  test('render', () => {
    const component = shallowWithIntl(
      <GettingStarted addBasePath={addBasePathMock} isDarkTheme={false} apps={mockApps} />
    );
    expect(component).toMatchSnapshot();
  });
  test('dark mode on', () => {
    const component = shallowWithIntl(
      <GettingStarted addBasePath={addBasePathMock} isDarkTheme={true} apps={mockApps} />
    );
    expect(component).toMatchSnapshot();
  });
});
