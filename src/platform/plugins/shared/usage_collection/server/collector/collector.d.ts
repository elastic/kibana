/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { CollectorFetchMethod, CollectorOptions, ICollector } from './types';
export declare class Collector<TFetchReturn, ExtraOptions extends object = {}>
  implements ICollector<TFetchReturn, ExtraOptions>
{
  readonly log: Logger;
  readonly type: CollectorOptions<TFetchReturn>['type'];
  readonly fetch: CollectorFetchMethod<TFetchReturn, ExtraOptions>;
  readonly isReady: CollectorOptions<TFetchReturn>['isReady'];
  /**
   * @internal Constructor of a Collector. It should be called via the CollectorSet factory methods: `makeStatsCollector` and `makeUsageCollector`
   * @param log {@link Logger}
   * @param collectorDefinition {@link CollectorOptions}
   */
  constructor(
    log: Logger,
    { type, fetch, isReady, ...options }: CollectorOptions<TFetchReturn, ExtraOptions>
  );
}
