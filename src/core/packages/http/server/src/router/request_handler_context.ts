/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AwaitedProperties } from '@kbn/utility-types';

/**
 * Base, abstract type for request handler contexts.
 * @public
 **/
export interface RequestHandlerContextBase {
  /**
   * Await all the specified context parts and return them.
   *
   * @example
   * ```ts
   * const resolved = await context.resolve(['core', 'pluginA']);
   * const esClient = resolved.core.elasticsearch.client;
   * const pluginAService = resolved.pluginA.someService;
   * ```
   */
  resolve: <T extends keyof Omit<this, 'resolve'>>(
    parts: T[]
  ) => Promise<AwaitedProperties<Pick<this, T>>>;
}
