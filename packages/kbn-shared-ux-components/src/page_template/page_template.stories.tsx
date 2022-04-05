/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { KibanaPageTemplate } from './page_template';
import mdx from './page_template.mdx';
import { KibanaPageTemplateSolutionNavProps } from './solution_nav';
import { KibanaPageTemplateProps } from './types';

export default {
  title: 'Page Template/Page Template',
  description:
    'A thin wrapper around `EuiTemplate`. Takes care of styling, empty state and no data config',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

type Params = Pick<KibanaPageTemplateProps, 'isEmptyState'>;

const noDataConfig = {
  solution: 'Kibana',
  action: {
    elasticAgent: {},
  },
  docsLink: 'http://wwww.docs.elastic.co',
};

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
  items,
  logo: 'logoKibana',
  name: 'Kibana',
  action: { elasticAgent: {} },
};

const content = (
  <EuiText textAlign="center">
    <p>
      <strong>Page Content goes here</strong>
    </p>
  </EuiText>
);

export const WithNoDataConfig = () => {
  return <KibanaPageTemplate noDataConfig={noDataConfig} />;
};

export const WithNoDataConfigAndSolutionNav = () => {
  return <KibanaPageTemplate noDataConfig={noDataConfig} solutionNav={solutionNav} />;
};

export const WithSolutionNav = () => {
  return <KibanaPageTemplate solutionNav={solutionNav}>{content}</KibanaPageTemplate>;
};

export const PureComponent = (params: Params) => {
  return <KibanaPageTemplate {...params}>{content}</KibanaPageTemplate>;
};

PureComponent.argTypes = {
  isEmptyState: {
    control: 'boolean',
    defaultValue: false,
  },
};

PureComponent.parameters = {
  layout: 'fullscreen',
};

WithNoDataConfig.parameters = {
  layout: 'fullscreen',
};

WithNoDataConfigAndSolutionNav.parameters = {
  layout: 'fullscreen',
};

WithSolutionNav.parameters = {
  layout: 'fullscreen',
};
