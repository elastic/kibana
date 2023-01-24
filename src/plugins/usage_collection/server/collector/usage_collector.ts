/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/core/server';
import type { CollectorOptions } from './types';
import { Collector } from './collector';

/**
 * Same as {@link CollectorOptions} but with the `schema` property enforced
 */
export type UsageCollectorOptions<
  TFetchReturn = unknown,
  ExtraOptions extends object = {}
> = CollectorOptions<TFetchReturn, ExtraOptions> &
  Required<Pick<CollectorOptions<TFetchReturn>, 'schema'>>;

/**
 * @private Only used in fixtures as a type
 */
export class UsageCollector<TFetchReturn, ExtraOptions extends object = {}> extends Collector<
  TFetchReturn,
  ExtraOptions
> {
  constructor(log: Logger, collectorOptions: UsageCollectorOptions<TFetchReturn, ExtraOptions>) {
    super(log, collectorOptions);
  }
}
