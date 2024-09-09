/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const APP_BASE_PATH = 'http://localhost:9001';

export const sectionsMock = [
  {
    id: 'data',
    title: 'Data',
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
    id: 'content',
    title: 'Content',
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
    ],
  },
  {
    id: 'other',
    title: 'Other',
    apps: [
      {
        id: 'api_keys',
        title: 'API Keys',
        enabled: true,
        basePath: '/app/management/ingest/pipelines_logstash',
      },
    ],
  },
];
