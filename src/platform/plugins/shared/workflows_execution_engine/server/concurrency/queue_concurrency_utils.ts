/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConcurrencySettings, EsWorkflowExecution } from '@kbn/workflows';
import { DEFAULT_CONCURRENCY_QUEUE_TTL } from '@kbn/workflows';

import { parseDuration } from '../utils/parse-duration/parse-duration';

export const resolveQueueTtlSetting = (concurrencySettings?: ConcurrencySettings): string =>
  concurrencySettings?.['queue-ttl'] ?? DEFAULT_CONCURRENCY_QUEUE_TTL;

export const resolveQueueTtlMs = (concurrencySettings?: ConcurrencySettings): number =>
  parseDuration(resolveQueueTtlSetting(concurrencySettings));

export const getQueueWaitDeadlineMs = (
  execution: Pick<EsWorkflowExecution, 'createdAt'>,
  concurrencySettings?: ConcurrencySettings
): number => new Date(execution.createdAt).getTime() + resolveQueueTtlMs(concurrencySettings);
