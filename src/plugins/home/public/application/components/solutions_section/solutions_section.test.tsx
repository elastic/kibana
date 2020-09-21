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
import { shallow } from 'enzyme';
import { SolutionsSection } from './solutions_section';

const solutionEntry1 = {
  id: 'kibana',
  title: 'Kibana',
  subtitle: 'Visualize & analyze',
  descriptions: ['Analyze data in dashboards'],
  icon: 'logoKibana',
  path: 'kibana_landing_page',
  order: 1,
};
const solutionEntry2 = {
  id: 'solution-2',
  title: 'Solution two',
  subtitle: 'Subtitle for solution two',
  descriptions: ['Example use case'],
  icon: 'empty',
  path: 'path-to-solution-two',
  order: 2,
};
const solutionEntry3 = {
  id: 'solution-3',
  title: 'Solution three',
  subtitle: 'Subtitle for solution three',
  descriptions: ['Example use case'],
  icon: 'empty',
  path: 'path-to-solution-three',
  order: 3,
};
const solutionEntry4 = {
  id: 'solution-4',
  title: 'Solution four',
  subtitle: 'Subtitle for solution four',
  descriptions: ['Example use case'],
  icon: 'empty',
  path: 'path-to-solution-four',
  order: 4,
};

const addBasePathMock = (path: string) => (path ? path : 'path');

describe('SolutionsSection', () => {
  test('only renders a spacer if no solutions are available', () => {
    const component = shallow(<SolutionsSection addBasePath={addBasePathMock} solutions={[]} />);
    expect(component).toMatchSnapshot();
  });

  test('renders a single solution', () => {
    const component = shallow(
      <SolutionsSection addBasePath={addBasePathMock} solutions={[solutionEntry1]} />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders multiple solutions in two columns with Kibana in its own column', () => {
    const component = shallow(
      <SolutionsSection
        addBasePath={addBasePathMock}
        solutions={[solutionEntry1, solutionEntry2, solutionEntry3, solutionEntry4]}
      />
    );
    expect(component).toMatchSnapshot();
  });
  test('renders multiple solutions in a single column when Kibana apps are not enabled', () => {
    const component = shallow(
      <SolutionsSection
        addBasePath={addBasePathMock}
        solutions={[solutionEntry2, solutionEntry3, solutionEntry4]}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
