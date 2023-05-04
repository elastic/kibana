/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCountersSavedObject } from '@kbn/usage-collection-plugin/server';

export const rawUsageCounters: UsageCountersSavedObject[] = [
  {
    type: 'usage-counters',
    id: 'uiCounter:09042021:count:myApp:my_event',
    attributes: {
      count: 1,
      counterName: 'myApp:my_event',
      counterType: 'count',
      domainId: 'uiCounter',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:17:57.693Z',
  },
  {
    type: 'usage-counters',
    id: 'uiCounter:23102020:loaded:Kibana_home:intersecting_event',
    attributes: {
      count: 60,
      counterName: 'Kibana_home:intersecting_event',
      counterType: 'loaded',
      domainId: 'uiCounter',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2020-10-23T11:27:57.067Z',
  },
  {
    type: 'usage-counters',
    id: 'uiCounter:09042021:count:myApp:my_event_4457914848544',
    attributes: {
      count: 0,
      counterName: 'myApp:my_event_4457914848544',
      counterType: 'count',
      domainId: 'uiCounter',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.030Z',
  },
  {
    type: 'usage-counters',
    id: 'uiCounter:09042021:count:myApp:my_event_malformed',
    attributes: {
      // @ts-expect-error
      count: 'malformed',
      counterName: 'myApp:my_event_malformed',
      counterType: 'count',
      domainId: 'uiCounter',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.030Z',
  },
  {
    type: 'usage-counters',
    id: 'anotherDomainId:09042021:count:some_event_name',
    attributes: {
      count: 4,
      counterName: 'some_event_name',
      counterType: 'count',
      domainId: 'anotherDomainId',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.030Z',
  },
  {
    type: 'usage-counters',
    id: 'uiCounter:09042021:count:myApp:my_event_4457914848544_2',
    attributes: {
      count: 8,
      counterName: 'myApp:my_event_4457914848544_2',
      counterType: 'count',
      domainId: 'uiCounter',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.031Z',
  },
  {
    type: 'usage-counters',
    id: 'uiCounter:09042021:count:myApp:only_reported_in_usage_counters',
    attributes: {
      count: 1,
      counterName: 'myApp:only_reported_in_usage_counters',
      counterType: 'count',
      domainId: 'uiCounter',
    },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.031Z',
  },
];
