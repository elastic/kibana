/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';

import type { PossibleSchemaTypes } from '@kbn/analytics-client';

export type {
  AllowedSchemaTypes,
  AllowedSchemaStringTypes,
  AllowedSchemaBooleanTypes,
  AllowedSchemaNumberTypes,
  PossibleSchemaTypes,
} from '@kbn/analytics-client';

/**
 * Helper to find out whether to keep recursively looking or if we are on an end value
 */
export type RecursiveMakeSchemaFrom<U> = U extends object
  ? MakeSchemaFrom<U>
  : { type: PossibleSchemaTypes<U>; _meta?: { description: string } };

/**
 * The `schema` property in {@link CollectorOptions} must match the output of
 * the `fetch` method. This type helps ensure that is correct
 */
export type MakeSchemaFrom<Base> = {
  // Using Required to enforce all optional keys in the object
  [Key in keyof Required<Base>]: Required<Base>[Key] extends Array<infer U>
    ? { type: 'array'; items: RecursiveMakeSchemaFrom<U> }
    : RecursiveMakeSchemaFrom<Required<Base>[Key]>;
};

/**
 * The context for the `fetch` method: It includes the most commonly used clients in the collectors (ES and SO clients).
 * Both are scoped based on the request and the context:
 * - When users are requesting a sample of data, it is scoped to their role to avoid exposing data they shouldn't read
 * - When building the telemetry data payload to report to the remote cluster, the requests are scoped to the `kibana` internal user
 *
 * @remark Bear in mind when testing your collector that your user has the same privileges as the Kibana Internal user to ensure the expected data is sent to the remote cluster.
 */
export interface CollectorFetchContext {
  /**
   * Request-scoped Elasticsearch client
   * @remark Bear in mind when testing your collector that your user has the same privileges as the Kibana Internal user to ensure the expected data is sent to the remote cluster (more info: {@link CollectorFetchContext})
   */
  esClient: ElasticsearchClient;
  /**
   * Request-scoped Saved Objects client
   * @remark Bear in mind when testing your collector that your user has the same privileges as the Kibana Internal user to ensure the expected data is sent to the remote cluster (more info: {@link CollectorFetchContext})
   */
  soClient: SavedObjectsClientContract;
}

/**
 * The fetch method has the context of the Collector itself
 * (this has access to all the properties of the collector like the logger)
 * and the the first parameter is {@link CollectorFetchContext}.
 */
export type CollectorFetchMethod<TReturn, ExtraOptions extends object = {}> = (
  this: ICollector<TReturn> & ExtraOptions, // Specify the context of `this` for this.log and others to become available
  context: CollectorFetchContext
) => Promise<TReturn> | TReturn;

/**
 * Options to instantiate a collector
 */
export type CollectorOptions<TFetchReturn = unknown, ExtraOptions extends object = {}> = {
  /**
   * Unique string identifier for the collector
   */
  type: string;
  /**
   * Method to return `true`/`false` or Promise(`true`/`false`) to confirm if the collector is ready for the `fetch` method to be called.
   */
  isReady: () => Promise<boolean> | boolean;
  /**
   * Schema definition of the output of the `fetch` method.
   */
  schema?: MakeSchemaFrom<TFetchReturn>;
  /**
   * The method that will collect and return the data in the final format.
   * @param collectorFetchContext {@link CollectorFetchContext}
   */
  fetch: CollectorFetchMethod<TFetchReturn, ExtraOptions>;
} & ExtraOptions;

/**
 * Common interface for Usage and Stats Collectors
 */
export interface ICollector<TFetchReturn, ExtraOptions extends object = {}> {
  /** Logger **/
  readonly log: Logger;
  /** The registered type (aka name) of the collector **/
  readonly type: CollectorOptions<TFetchReturn>['type'];
  /**
   * The actual logic that reports the Usage collection.
   * It will be called on every collection request.
   * Whatever is returned in this method will be passed through as-is under
   * the {@link ICollector.type} key.
   *
   * @example
   * {
   *   [type]: await fetch(context)
   * }
   */
  readonly fetch: CollectorFetchMethod<TFetchReturn, ExtraOptions>;
  /**
   * Should return `true` when it's safe to call the `fetch` method.
   */
  readonly isReady: CollectorOptions<TFetchReturn>['isReady'];
}
