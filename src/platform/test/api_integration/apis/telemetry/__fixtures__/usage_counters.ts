/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const basicUsageCounters = {
  dailyEvents: [
    {
      domainId: 'anotherDomainId',
      counterName: 'some_event_name',
      counterType: 'count',
      lastUpdatedAt: '2021-11-20T11:43:00.961Z',
      fromTimestamp: '2021-11-20T00:00:00Z',
      total: 3,
    },
    {
      domainId: 'anotherDomainId',
      counterName: 'some_event_name',
      counterType: 'count',
      lastUpdatedAt: '2021-04-09T11:43:00.961Z',
      fromTimestamp: '2021-04-09T00:00:00Z',
      total: 2,
    },
    {
      domainId: 'anotherDomainId2',
      counterName: 'some_event_name',
      counterType: 'count',
      lastUpdatedAt: '2021-04-20T08:18:03.030Z',
      fromTimestamp: '2021-04-20T00:00:00Z',
      total: 1,
    },
  ],
};
