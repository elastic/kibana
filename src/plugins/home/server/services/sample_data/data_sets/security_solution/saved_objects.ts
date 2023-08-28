/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint max-len: 0 */

import { SavedObject } from '@kbn/core/server';

export const getSavedObjects = (): SavedObject[] => [
  {
    attributes: {
      fieldAttrs: '{}',
      fieldFormatMap: '{}',
      fields: '[]',
      name: 'Kibana Sample Data Security Solution',
      runtimeFieldMap: '{}',
      sourceFilters: '[]',
      timeFieldName: '@timestamp',
      title: 'auditbeat-sample-data,.alerts-security.alerts-default',
      typeMeta: '{}',
    },
    coreMigrationVersion: '8.8.0',
    created_at: '2023-08-16T10:09:47.143Z',
    id: 'c89b196d-d0cd-4cfb-8d95-787e4ce51551',
    managed: false,
    references: [],
    type: 'index-pattern',
    typeMigrationVersion: '8.0.0',
    updated_at: '2023-08-16T10:09:47.143Z',
    version: 'WzQ1LDFd',
  },
  {
    id: '717d50d0-3c37-11ee-ae29-adafdb6b4012',
    type: 'search',
    version: 'WzE2NiwxXQ==',
    attributes: {
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"highlightAll":true,"version":true,"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      title: '[Auditbeat] Auditbeat sample data',
      sort: [['@timestamp', 'desc']],
      columns: ['agent.name', 'agent.type', 'ecs.version', 'event.kind', 'host.hostname'],
      description: '',
      grid: {},
      hideChart: false,
      isTextBasedQuery: false,
      usesAdHocDataView: false,
      timeRestore: false,
    },
    references: [
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
        id: 'c89b196d-d0cd-4cfb-8d95-787e4ce51551',
      },
    ],
    managed: false,
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '8.0.0',
  },
];
