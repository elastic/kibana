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
import { SolutionsSection } from './solutions_section';

const solutionEntry1 = {
  id: 'kibana',
  title: 'Kibana',
  description: 'Description for Kibana',
  icon: 'logoKibana',
  path: 'kibana_landing_page',
  order: 1,
};
const solutionEntry2 = {
  id: 'solution-2',
  title: 'Solution two',
  description: 'Description for solution two',
  icon: 'empty',
  path: 'path-to-solution-two',
  order: 2,
};
const solutionEntry3 = {
  id: 'solution-3',
  title: 'Solution three',
  description: 'Description for solution three',
  icon: 'empty',
  path: 'path-to-solution-three',
  order: 3,
};
const solutionEntry4 = {
  id: 'solution-4',
  title: 'Solution four',
  description: 'Description for solution four',
  icon: 'empty',
  path: 'path-to-solution-four',
  order: 4,
};

const addBasePathMock = (path: string) => (path ? path : 'path');

describe('SolutionsSection', () => {
  test('renders null if no solutions are available', () => {
    const component = shallow(<SolutionsSection addBasePath={addBasePathMock} solutions={[]} />);
    expect(component).toMatchSnapshot();
  });

  test('renders a single solution', () => {
    const component = shallow(
      <SolutionsSection addBasePath={addBasePathMock} solutions={[solutionEntry1]} />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders multiple solutions', () => {
    const component = shallow(
      <SolutionsSection
        addBasePath={addBasePathMock}
        solutions={[solutionEntry1, solutionEntry2, solutionEntry3, solutionEntry4]}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
