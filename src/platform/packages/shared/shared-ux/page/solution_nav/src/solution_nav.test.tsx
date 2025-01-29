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
import { SolutionNav, SolutionNavProps } from './solution_nav';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinBreakpoints: (args: string[]) => {
      return args[0] === 'xs';
    },
  };
});

const items: SolutionNavProps['items'] = [
  {
    name: 'Ingest',
    id: '1',
    items: [
      {
        name: 'Ingest Node Pipelines',
        id: '1.1',
      },
      {
        name: 'Logstash Pipelines',
        id: '1.2',
      },
      {
        name: 'Beats Central Management',
        id: '1.3',
      },
    ],
  },
  {
    name: 'Data',
    id: '2',
    items: [
      {
        name: 'Index Management',
        id: '2.1',
      },
      {
        name: 'Index Lifecycle Policies',
        id: '2.2',
      },
      {
        name: 'Snapshot and Restore',
        id: '2.3',
      },
    ],
  },
];

describe('SolutionNav', () => {
  describe('heading', () => {
    test('accepts more headingProps', () => {
      const component = shallow(
        <SolutionNav name="Solution" headingProps={{ id: 'testID', element: 'h3' }} />
      );

      expect(component).toMatchSnapshot();
    });
  });

  test('renders', () => {
    const component = shallow(<SolutionNav name="Solution" items={items} />);
    expect(component).toMatchSnapshot();
  });

  test('renders with icon', () => {
    const component = shallow(<SolutionNav name="Solution" icon="logoElastic" items={items} />);
    expect(component).toMatchSnapshot();
  });

  test('renders with children', () => {
    const component = shallow(
      <SolutionNav name="Solution" data-test-subj="DTS">
        <span id="dummy_component" />
      </SolutionNav>
    );
    expect(component.find('#dummy_component').length > 0).toBeTruthy();
  });

  test('accepts EuiSideNavProps', () => {
    const component = shallow(<SolutionNav name="Solution" data-test-subj="DTS" items={items} />);
    expect(component).toMatchSnapshot();
  });

  test('accepts canBeCollapsed prop', () => {
    const canBeCollapsed = shallow(
      <SolutionNav name="Solution" canBeCollapsed={true} items={items} />
    );
    expect(canBeCollapsed).toMatchSnapshot();
    const noCollapse = shallow(
      <SolutionNav name="Solution" canBeCollapsed={false} items={items} />
    );
    expect(noCollapse).toMatchSnapshot();
  });
});
