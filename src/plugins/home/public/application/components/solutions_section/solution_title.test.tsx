/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SolutionTitle } from './solution_title';

const solutionEntry = {
  id: 'kibana',
  title: 'Kibana',
  subtitle: 'Visualize & analyze',
  descriptions: ['Analyze data in dashboards'],
  icon: 'logoKibana',
  path: 'kibana_landing_page',
  order: 1,
};

describe('SolutionTitle', () => {
  test('renders the title section of the solution panel', () => {
    const component = shallow(
      <SolutionTitle
        title={solutionEntry.title}
        subtitle={solutionEntry.subtitle}
        iconType={solutionEntry.icon}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
