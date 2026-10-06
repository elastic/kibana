/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type moment from 'moment';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { IUsageCounter } from '../usage_counter';
export declare function rollUsageCountersIndices({
  logger,
  getRegisteredUsageCounters,
  internalRepository,
  now,
}: {
  logger: Logger;
  getRegisteredUsageCounters: () => IUsageCounter[];
  internalRepository?: ISavedObjectsRepository;
  now?: moment.Moment;
}): Promise<number | undefined>;
