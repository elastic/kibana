/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TaskInstanceWithId } from '@kbn/task-manager-plugin/server/task';

export const TASK_ID = 'unusedUrlsCleanupTask';
export const TASK_SCHEDULE_INTERVAL = '30s'; // TODO: Change this to 1 week
export const SAVED_OBJECT_TYPE = 'url';
export const PIT_KEEP_ALIVE = '10m';
export const MAX_PAGE_SIZE = 10000;
export const DEFAULT_MAX_AGE = '1y';
export const DELETE_UNUSED_URLS_TASK: TaskInstanceWithId = {
  id: TASK_ID,
  taskType: TASK_ID,
  params: {},
  state: {},
  schedule: {
    interval: TASK_SCHEDULE_INTERVAL,
  },
};
