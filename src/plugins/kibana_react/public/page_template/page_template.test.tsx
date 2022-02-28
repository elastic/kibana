/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow, render } from 'enzyme';
import { KibanaPageTemplate, KibanaPageTemplateProps } from './page_template';
import { EuiEmptyPrompt } from '@elastic/eui';
import { KibanaPageTemplateSolutionNavProps } from './solution_nav';

const navItems: KibanaPageTemplateSolutionNavProps['items'] = [
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

const noDataConfig: KibanaPageTemplateProps['noDataConfig'] = {
  solution: 'Elastic',
  actions: {
    elasticAgent: {},
    beats: {},
    custom: {},
  },
  docsLink: 'test',
};

describe('KibanaPageTemplate', () => {
  test('render default empty prompt', () => {
    const component = shallow(
      <KibanaPageTemplate
        isEmptyState={true}
        pageHeader={{
          iconType: 'test',
          title: 'test',
          description: 'test',
          rightSideItems: ['test'],
        }}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('render custom empty prompt only', () => {
    const component = shallow(
      <KibanaPageTemplate isEmptyState={true}>
        <EuiEmptyPrompt title={<h1>custom test</h1>} />
      </KibanaPageTemplate>
    );
    expect(component).toMatchSnapshot();
  });

  test('render custom empty prompt with page header', () => {
    const component = shallow(
      <KibanaPageTemplate
        isEmptyState={true}
        pageHeader={{
          iconType: 'test',
          title: 'test',
          description: 'test',
          rightSideItems: ['test'],
        }}
      >
        <EuiEmptyPrompt title={<h1>custom test</h1>} />
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
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('render solutionNav', () => {
    const component = render(
      <KibanaPageTemplate
        pageHeader={{
          iconType: 'test',
          title: 'test',
          description: 'test',
          rightSideItems: ['test'],
        }}
        solutionNav={{
          name: 'Solution',
          icon: 'solution',
          items: navItems,
        }}
      />
    );
    expect(component).toMatchSnapshot();
    expect(component.find('div.kbnPageTemplate__pageSideBar').length).toBe(1);
  });

  test('render noDataContent', () => {
    const component = shallow(
      <KibanaPageTemplate
        pageHeader={{
          iconType: 'test',
          title: 'test',
          description: 'test',
          rightSideItems: ['test'],
        }}
        solutionNav={{
          name: 'Solution',
          icon: 'solution',
          items: navItems,
        }}
        noDataConfig={noDataConfig}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('render sidebar classes', () => {
    const component = shallow(
      <KibanaPageTemplate
        solutionNav={{
          name: 'Solution',
          icon: 'solution',
          items: navItems,
        }}
        pageSideBarProps={{ className: 'customClass' }}
      />
    );
    expect(component.html().includes('kbnPageTemplate__pageSideBar customClass')).toBe(true);
  });
});
