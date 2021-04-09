/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCountersSavedObject } from '../../../../../usage_collection/server';

export const rawUsageCounters: UsageCountersSavedObject[] = [
  {
    type: 'usage-counters',
    id: 'uiCounter:09042021:count:myApp:my_event_malformed',
    attributes: { count: 13 },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.030Z',
    version: 'WzUsMV0=',
    score: 0,
  },
  {
    type: 'usage-counters',
    id: 'anotherDomainId:09042021:count:some_event_name',
    attributes: { count: 4 },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-09T08:18:03.030Z',
    version: 'WzUsMV0=',
    score: 0,
  },
  {
    type: 'usage-counters',
    id: 'anotherDomainId:09042021:count:some_event_name',
    attributes: { count: 4 },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-11T08:18:03.030Z',
    version: 'WzUsMV0=',
    score: 0,
  },
  {
    type: 'usage-counters',
    id: 'anotherDomainId2:09042021:count:some_event_name',
    attributes: { count: 1 },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-20T08:18:03.030Z',
    version: 'WzUsMV0=',
    score: 0,
  },
  {
    type: 'usage-counters',
    id: 'anotherDomainId2:09042021:count:malformed_event',
    attributes: { count: 'malformed' },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-20T08:18:03.030Z',
    version: 'WzUsMV0=',
    score: 0,
  },
  {
    type: 'usage-counters',
    id: 'anotherDomainId2:09042021:custom_type:some_event_name',
    attributes: { count: 3 },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-20T08:18:03.030Z',
    version: 'WzUsMV0=',
    score: 0,
  },
  {
    type: 'usage-counters',
    id: 'anotherDomainId3:09042021:custom_type:zero_count',
    attributes: { count: 0 },
    references: [],
    coreMigrationVersion: '8.0.0',
    updated_at: '2021-04-20T08:18:03.030Z',
    version: 'WzUsMV0=',
    score: 0,
  },
];
