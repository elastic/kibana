/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SolutionsSection } from './solutions_section';
import { FeatureCatalogueCategory } from '../../../services';

const solutionEntry1 = {
  id: 'kibana',
  title: 'Kibana',
  subtitle: 'Visualize & analyze',
  appDescriptions: ['Analyze data in dashboards'],
  icon: 'logoKibana',
  path: 'kibana_landing_page',
  order: 1,
};
const solutionEntry2 = {
  id: 'solution-2',
  title: 'Solution two',
  subtitle: 'Subtitle for solution two',
  description: 'Description for solution two',
  appDescriptions: ['Example use case'],
  icon: 'empty',
  path: 'path-to-solution-two',
  order: 2,
};
const solutionEntry3 = {
  id: 'solution-3',
  title: 'Solution three',
  subtitle: 'Subtitle for solution three',
  description: 'Description for solution three',
  appDescriptions: ['Example use case'],
  icon: 'empty',
  path: 'path-to-solution-three',
  order: 3,
};
const solutionEntry4 = {
  id: 'solution-4',
  title: 'Solution four',
  subtitle: 'Subtitle for solution four',
  description: 'Description for solution four',
  appDescriptions: ['Example use case'],
  icon: 'empty',
  path: 'path-to-solution-four',
  order: 4,
};

const mockDirectories = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Description of dashboard',
    icon: 'dashboardApp',
    path: 'dashboard_landing_page',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.DATA,
  },
  {
    id: 'discover',
    title: 'Discover',
    description: 'Description of discover',
    icon: 'discoverApp',
    path: 'discover_landing_page',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.DATA,
  },
  {
    id: 'canvas',
    title: 'Canvas',
    description: 'Description of canvas',
    icon: 'canvasApp',
    path: 'canvas_landing_page',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.DATA,
  },
];

const addBasePathMock = (path: string) => (path ? path : 'path');

describe('SolutionsSection', () => {
  test('only renders a spacer if no solutions are available', () => {
    const component = shallow(
      <SolutionsSection
        addBasePath={addBasePathMock}
        solutions={[]}
        directories={mockDirectories}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders a single solution', () => {
    const component = shallow(
      <SolutionsSection
        addBasePath={addBasePathMock}
        solutions={[solutionEntry1]}
        directories={mockDirectories}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders multiple solutions in two columns with Kibana in its own column', () => {
    const component = shallow(
      <SolutionsSection
        addBasePath={addBasePathMock}
        solutions={[solutionEntry1, solutionEntry2, solutionEntry3, solutionEntry4]}
        directories={mockDirectories}
      />
    );
    expect(component).toMatchSnapshot();
  });
  test('renders multiple solutions in a single column when Kibana apps are not enabled', () => {
    const component = shallow(
      <SolutionsSection
        addBasePath={addBasePathMock}
        solutions={[solutionEntry2, solutionEntry3, solutionEntry4]}
        directories={mockDirectories}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
