/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCountersSavedObject } from '@kbn/usage-collection-plugin/server';

export const rawServerCounters: UsageCountersSavedObject[] = [
  {
    type: 'usage-counter',
    id: 'myApp:my_event:count:server:20210409',
    attributes: {
      domainId: 'myApp',
      counterName: 'my_event',
      counterType: 'count',
      source: 'server',
      count: 1,
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:17:57.693Z',
  },
  {
    type: 'usage-counter',
    id: 'Kibana_home:intersecting_event:loaded:server:20201023',
    attributes: {
      domainId: 'Kibana_home',
      counterName: 'intersecting_event',
      counterType: 'loaded',
      source: 'server',
      count: 60,
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2020-10-23T11:27:57.067Z',
  },
  {
    type: 'usage-counter',
    id: 'myApp:my_event_4457914848544:count:server:20210409',
    attributes: {
      domainId: 'myApp',
      counterName: 'my_event_4457914848544',
      counterType: 'count',
      source: 'server',
      count: 0,
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.030Z',
  },
  {
    type: 'usage-counter',
    id: 'myApp:my_event_malformed:count:server:20210409',
    attributes: {
      domainId: 'myApp',
      counterName: 'my_event_malformed',
      counterType: 'count',
      source: 'server',
      // @ts-expect-error
      count: 'malformed',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.030Z',
  },
  {
    type: 'usage-counter',
    id: 'myApp:my_event_4457914848544_2:count:server:20210409',
    attributes: {
      domainId: 'myApp',
      counterName: 'my_event_4457914848544_2',
      counterType: 'count',
      source: 'server',
      count: 8,
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.031Z',
  },
  {
    type: 'usage-counter',
    id: 'myApp:only_reported_in_usage_counters:count:server:20210409',
    attributes: {
      domainId: 'myApp',
      counterName: 'only_reported_in_usage_counters',
      counterType: 'count',
      source: 'server',
      count: 1,
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.031Z',
  },
  {
    type: 'usage-counter',
    id: 'myApp:namespaced_counter:count:server:20240627:first',
    namespaces: ['first'],
    attributes: {
      domainId: 'myApp',
      counterName: 'namespaced_counter',
      counterType: 'count',
      source: 'server',
      count: 1,
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2024-06-27T08:18:03.031Z',
  },
  {
    type: 'usage-counter',
    id: 'myApp:namespaced_counter:count:server:20240627:second',
    namespaces: ['second'],
    attributes: {
      domainId: 'myApp',
      counterName: 'namespaced_counter',
      counterType: 'count',
      source: 'server',
      count: 2,
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2024-06-27T09:18:03.031Z',
  },
  {
    type: 'usage-counter',
    id: 'myApp:namespaced_counter:count:server:20240627:third',
    namespaces: ['third'],
    attributes: {
      domainId: 'myApp',
      counterName: 'namespaced_counter',
      counterType: 'count',
      source: 'server',
      count: 3,
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2024-06-27T10:18:03.031Z',
  },
  {
    type: 'usage-counter',
    id: 'myApp:namespaced_counter:count:server:20240627:default',
    namespaces: ['default'],
    attributes: {
      domainId: 'myApp',
      counterName: 'namespaced_counter',
      counterType: 'count',
      source: 'server',
      count: 10,
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2024-06-27T11:18:03.031Z',
  },
];

export const rawUiCounters: UsageCountersSavedObject[] = rawServerCounters.map((counter) => ({
  ...counter,
  id: counter.id.replace(':server:', ':ui:'),
  attributes: {
    ...counter.attributes,
    source: 'ui',
  },
}));
