/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/core/server';
import type { CollectorFetchMethod, CollectorOptions, ICollector } from './types';

export class Collector<TFetchReturn, ExtraOptions extends object = {}>
  implements ICollector<TFetchReturn, ExtraOptions>
{
  public readonly type: CollectorOptions<TFetchReturn>['type'];
  public readonly fetch: CollectorFetchMethod<TFetchReturn, ExtraOptions>;
  public readonly isReady: CollectorOptions<TFetchReturn>['isReady'];
  /**
   * @private Constructor of a Collector. It should be called via the CollectorSet factory methods: `makeStatsCollector` and `makeUsageCollector`
   * @param log {@link Logger}
   * @param collectorDefinition {@link CollectorOptions}
   */
  constructor(
    public readonly log: Logger,
    { type, fetch, isReady, ...options }: CollectorOptions<TFetchReturn, ExtraOptions>
  ) {
    if (type === undefined) {
      throw new Error('Collector must be instantiated with a options.type string property');
    }
    if (typeof fetch !== 'function') {
      throw new Error('Collector must be instantiated with a options.fetch function property');
    }

    Object.assign(this, options); // spread in other properties and mutate "this"

    this.type = type;
    this.fetch = fetch;
    this.isReady = typeof isReady === 'function' ? isReady : () => true;
  }
}
