/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MaintenanceWindowStatus } from './types';

export const RUNNING_MAINTENANCE_WINDOW_1 = {
  title: 'Running maintenance window 1',
  id: '63057284-ac31-42ba-fe22-adfe9732e5ae',
  status: MaintenanceWindowStatus.Running,
  events: [{ gte: '2023-04-20T16:27:30.753Z', lte: '2023-04-20T16:57:30.753Z' }],
};

export const RUNNING_MAINTENANCE_WINDOW_2 = {
  title: 'Running maintenance window 2',
  id: '45894340-df98-11ed-ac81-bfcb4982b4fd',
  status: MaintenanceWindowStatus.Running,
  events: [{ gte: '2023-04-20T16:47:42.871Z', lte: '2023-04-20T17:11:32.192Z' }],
};

export const RECURRING_RUNNING_MAINTENANCE_WINDOW = {
  title: 'Recurring running maintenance window',
  id: 'e2228300-e9ad-11ed-ba37-db17c6e6182b',
  status: MaintenanceWindowStatus.Running,
  events: [
    { gte: '2023-05-03T12:27:18.569Z', lte: '2023-05-03T12:57:18.569Z' },
    { gte: '2023-05-10T12:27:18.569Z', lte: '2023-05-10T12:57:18.569Z' },
  ],
  expiration_date: '2024-05-03T12:27:35.088Z',
  r_rule: {
    dtstart: '2023-05-03T12:27:18.569Z',
    tzid: 'Europe/Amsterdam',
    freq: 3,
    interval: 1,
    count: 2,
    byweekday: ['WE'],
  },
};

export const UPCOMING_MAINTENANCE_WINDOW = {
  title: 'Upcoming maintenance window',
  id: '5eafe070-e030-11ed-ac81-bfcb4982b4fd',
  status: MaintenanceWindowStatus.Upcoming,
  events: [
    { gte: '2023-04-21T10:36:14.028Z', lte: '2023-04-21T10:37:00.000Z' },
    { gte: '2023-04-28T10:36:14.028Z', lte: '2023-04-28T10:37:00.000Z' },
  ],
};
