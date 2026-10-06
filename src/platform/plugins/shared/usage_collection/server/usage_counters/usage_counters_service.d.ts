/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsServiceSetup, SavedObjectsServiceStart } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { UsageCountersServiceSetup, UsageCountersServiceStart } from './types';
export interface UsageCountersServiceDeps {
  logger: Logger;
  retryCount: number;
  bufferDurationMs: number;
}
export interface UsageCountersServiceSetupDeps {
  savedObjects: SavedObjectsServiceSetup;
}
export interface UsageCountersServiceStartDeps {
  savedObjects: SavedObjectsServiceStart;
}
export declare class UsageCountersService {
  private readonly stop$;
  private readonly retryCount;
  private readonly bufferDurationMs;
  private readonly counterSets;
  private readonly source$;
  private readonly counter$;
  private readonly flushCache$;
  private readonly stopCaching$;
  private repository?;
  private readonly logger;
  constructor({ logger, retryCount, bufferDurationMs }: UsageCountersServiceDeps);
  setup: ({ savedObjects }: UsageCountersServiceSetupDeps) => UsageCountersServiceSetup;
  start: ({ savedObjects }: UsageCountersServiceStartDeps) => UsageCountersServiceStart;
  stop: () => UsageCountersServiceStart;
  private backoffDelay;
  private storeDate$;
  private createUsageCounter;
  private getUsageCounterByDomainId;
  private mergeCounters;
  private search;
}
