/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SolutionPanel } from './solution_panel';

const solutionEntry = {
  id: 'kibana',
  title: 'Kibana',
  description: 'Explore and analyze your data',
  icon: 'logoKibana',
  path: 'kibana_landing_page',
  order: 1,
};

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    trackUiMetric: jest.fn(),
  }),
}));

const addBasePathMock = (path: string) => (path ? path : 'path');

describe('SolutionPanel', () => {
  test('renders the solution panel for the given solution', () => {
    const component = shallow(
      <SolutionPanel addBasePath={addBasePathMock} solution={solutionEntry} />
    );
    expect(component).toMatchSnapshot();
  });
});
