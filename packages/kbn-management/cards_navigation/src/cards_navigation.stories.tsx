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
    ],
  },
];

export const CardsNavigation = () => {
  return <Component sections={sectionsMock} appBasePath="localhost:9001/app/" />;
};
