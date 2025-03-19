/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment/moment';
import type { SearchConfigSchema, SearchSessionsConfigSchema } from './server/config';

export const getMockSearchConfig = ({
  sessions: { enabled = true, defaultExpiration = moment.duration(7, 'd') } = {
    enabled: true,
    defaultExpiration: moment.duration(7, 'd'),
  },
  asyncSearch: {
    waitForCompletion = moment.duration(100, 'ms'),
    keepAlive = moment.duration(1, 'm'),
    batchedReduceSize = 64,
  } = {
    waitForCompletion: moment.duration(100, 'ms'),
    keepAlive: moment.duration(1, 'm'),
    batchedReduceSize: 64,
  },
}: Partial<{
  sessions: Partial<SearchSessionsConfigSchema>;
  asyncSearch: Partial<SearchConfigSchema['asyncSearch']>;
}>): SearchConfigSchema =>
  ({
    asyncSearch: {
      waitForCompletion,
      keepAlive,
      batchedReduceSize,
    } as SearchConfigSchema['asyncSearch'],
    sessions: {
      enabled,
      defaultExpiration,
    } as SearchSessionsConfigSchema,
  } as SearchConfigSchema);
