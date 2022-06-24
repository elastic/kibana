/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow, render } from 'enzyme';
import { KibanaPageTemplate } from './page_template';
import { KibanaPageTemplateSolutionNavProps } from './solution_nav';
import { NoDataPageProps } from './no_data_page';

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

const solutionNav = {
  name: 'Kibana',
  icon: 'logoKibana',
  items,
};

const noDataConfig: NoDataPageProps = {
  solution: 'Elastic',
  action: {
    elasticAgent: {},
  },
  docsLink: 'test',
};

describe('KibanaPageTemplate', () => {
  test('render noDataConfig && solutionNav', () => {
    const component = shallow(
      <KibanaPageTemplate noDataConfig={noDataConfig} solutionNav={solutionNav} />
    );
    expect(component).toMatchSnapshot();
  });

  test('render noDataConfig', () => {
    const component = shallow(<KibanaPageTemplate noDataConfig={noDataConfig} />);
    expect(component).toMatchSnapshot();
  });

  test('render solutionNav', () => {
    const component = shallow(
      <KibanaPageTemplate
        pageHeader={{
          iconType: 'test',
          title: 'test',
          description: 'test',
          rightSideItems: ['test'],
        }}
        solutionNav={solutionNav}
      >
        <div>Child element</div>
      </KibanaPageTemplate>
    );
    expect(component).toMatchSnapshot();
  });

  test('render basic template', () => {
    const component = render(
      <KibanaPageTemplate
        pageHeader={{
          iconType: 'test',
          title: 'test',
          description: 'test',
          rightSideItems: ['test'],
        }}
      >
        <div>Child element</div>
      </KibanaPageTemplate>
    );
    expect(component).toMatchSnapshot();
  });
});
