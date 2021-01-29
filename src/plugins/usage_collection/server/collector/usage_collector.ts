/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Logger } from 'src/core/server';
import { Collector, CollectorOptions } from './collector';

// Enforce the `schema` property for UsageCollectors
export type UsageCollectorOptions<
  TFetchReturn = unknown,
  WithKibanaRequest extends boolean = false,
  ExtraOptions extends object = {}
> = CollectorOptions<TFetchReturn, WithKibanaRequest, ExtraOptions> &
  Required<Pick<CollectorOptions<TFetchReturn, boolean>, 'schema'>>;

export class UsageCollector<TFetchReturn, ExtraOptions extends object = {}> extends Collector<
  TFetchReturn,
  ExtraOptions
> {
  constructor(
    log: Logger,
    collectorOptions: UsageCollectorOptions<TFetchReturn, any, ExtraOptions>
  ) {
    super(log, collectorOptions);
  }
}
