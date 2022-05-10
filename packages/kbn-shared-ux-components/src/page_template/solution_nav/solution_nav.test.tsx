/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { KibanaPageTemplateSolutionNav, KibanaPageTemplateSolutionNavProps } from './solution_nav';

jest.mock('@elastic/eui', () => ({
  useIsWithinBreakpoints: (args: string[]) => {
    return args[0] === 'xs';
  },
  EuiSideNav: function Component() {
    // no-op
  },
}));

const items: KibanaPageTemplateSolutionNavProps['items'] = [
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

describe('KibanaPageTemplateSolutionNav', () => {
  test('renders', () => {
    const component = shallow(<KibanaPageTemplateSolutionNav name="Solution" items={items} />);
    expect(component).toMatchSnapshot();
  });

  test('renders with icon', () => {
    const component = shallow(
      <KibanaPageTemplateSolutionNav name="Solution" icon="logoElastic" items={items} />
    );
    expect(component).toMatchSnapshot();
  });

  test('accepts EuiSideNavProps', () => {
    const component = shallow(
      <KibanaPageTemplateSolutionNav name="Solution" data-test-subj="DTS" items={items} />
    );
    expect(component).toMatchSnapshot();
  });
});
