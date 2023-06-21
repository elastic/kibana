/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { CardsNavigation as Component } from './cards_navigation';

import mdx from '../README.mdx';

export default {
  title: 'Developer/Cards Navigation',
  description: '',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const sectionsMock = [
  {
    apps: [
      {
        id: 'ingest_pipelines',
        title: 'Ingest pipelines',
        enabled: true,
        basePath: '/app/management/ingest/pipelines',
      },
      {
        id: 'pipelines',
        title: 'Pipelines',
        enabled: true,
        basePath: '/app/management/ingest/pipelines_logstash',
      },
      {
        id: 'index_management',
        title: 'Index Management',
        enabled: true,
        basePath: '/app/management/ingest/pipelines_logstash',
      },
      {
        id: 'transform',
        title: 'Transforms',
        enabled: true,
        basePath: '/app/management/ingest/pipelines_logstash',
      },
      {
        id: 'jobsListLink',
        title: 'Machine Learning',
        enabled: true,
        basePath: '/app/management/ingest/pipelines_logstash',
      },
      {
        id: 'data_view',
        title: 'Data View',
        enabled: true,
        basePath: '/app/management/ingest/pipelines_logstash',
      },
    ],
  },
  {
    apps: [
      {
        id: 'objects',
        title: 'Saved Objects',
        enabled: true,
        basePath: '/app/management/ingest/pipelines_logstash',
      },
      {
        id: 'tags',
        title: 'Tags',
        enabled: true,
        basePath: '/app/management/ingest/pipelines_logstash',
      },
      {
        id: 'filesManagement',
        title: 'Files Management',
        enabled: true,
        basePath: '/app/management/ingest/pipelines_logstash',
      },
      {
        id: 'api_keys',
        title: 'API Keys',
        enabled: true,
        basePath: '/app/management/ingest/pipelines_logstash',
      },
    ],
  },
  {
    apps: [
      {
        id: 'settings',
        title: 'Advanced Settings',
        enabled: true,
        basePath: '/app/management/ingest/pipelines_logstash',
      },
    ]
  },
];

export const CardsNavigationWillAllLinks = () => {
  return <Component sections={sectionsMock} appBasePath="localhost:9001" />;
};

export const CardsNavigationWithSomeLinks = () => {
  return <Component sections={[{ apps: sectionsMock[1].apps }]} appBasePath="localhost:9001" />;
};
