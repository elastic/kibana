/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCountersSavedObject } from '@kbn/usage-collection-plugin/server';

export const rawCounters: UsageCountersSavedObject[] = [
  {
    type: 'foo-counters',
    id: 'myApp:09042021:count:my_event',
    attributes: {
      count: 1,
      counterName: 'my_event',
      counterType: 'count',
      domainId: 'myApp',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:17:57.693Z',
  },
  {
    type: 'foo-counters',
    id: 'Kibana_home:23102020:loaded:intersecting_event',
    attributes: {
      count: 60,
      counterName: 'intersecting_event',
      counterType: 'loaded',
      domainId: 'Kibana_home',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2020-10-23T11:27:57.067Z',
  },
  {
    type: 'foo-counters',
    id: 'myApp:09042021:count:my_event_4457914848544',
    attributes: {
      count: 0,
      counterName: 'my_event_4457914848544',
      counterType: 'count',
      domainId: 'myApp',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.030Z',
  },
  {
    type: 'foo-counters',
    id: 'myApp:09042021:count:my_event_malformed',
    attributes: {
      // @ts-expect-error
      count: 'malformed',
      counterName: 'my_event_malformed',
      counterType: 'count',
      domainId: 'myApp',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.030Z',
  },
  {
    type: 'foo-counters',
    id: 'myApp:09042021:count:my_event_4457914848544_2',
    attributes: {
      count: 8,
      counterName: 'my_event_4457914848544_2',
      counterType: 'count',
      domainId: 'myApp',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.031Z',
  },
  {
    type: 'foo-counters',
    id: 'myApp:09042021:count:only_reported_in_usage_counters',
    attributes: {
      count: 1,
      counterName: 'only_reported_in_usage_counters',
      counterType: 'count',
      domainId: 'myApp',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.031Z',
  },

  {
    type: 'foo-counters',
    id: 'myApp:27062024:count:namespaced_counter',
    namespaces: ['first'],
    attributes: {
      count: 1,
      counterName: 'namespaced_counter',
      counterType: 'count',
      domainId: 'myApp',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2024-06-27T08:18:03.031Z',
  },
  {
    type: 'foo-counters',
    id: 'myApp:27062024:count:namespaced_counter',
    namespaces: ['second'],
    attributes: {
      count: 2,
      counterName: 'namespaced_counter',
      counterType: 'count',
      domainId: 'myApp',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2024-06-27T09:18:03.031Z',
  },
  {
    type: 'foo-counters',
    id: 'myApp:27062024:count:namespaced_counter',
    namespaces: ['third'],
    attributes: {
      count: 3,
      counterName: 'namespaced_counter',
      counterType: 'count',
      domainId: 'myApp',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2024-06-27T10:18:03.031Z',
  },
  {
    type: 'foo-counters',
    id: 'myApp:27062024:count:namespaced_counter',
    namespaces: ['default'],
    attributes: {
      count: 10,
      counterName: 'namespaced_counter',
      counterType: 'count',
      domainId: 'myApp',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2024-06-27T11:18:03.031Z',
  },
];
