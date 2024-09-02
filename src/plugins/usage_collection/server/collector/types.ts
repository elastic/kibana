/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';

import type { PossibleSchemaTypes, SchemaMetaOptional } from '@elastic/ebt/client';

export type {
  AllowedSchemaTypes,
  AllowedSchemaStringTypes,
  AllowedSchemaBooleanTypes,
  AllowedSchemaNumberTypes,
  PossibleSchemaTypes,
} from '@elastic/ebt/client';

import type { Collector, UsageCollectorOptions } from '.';

/**
 * Interface to register and manage Usage Collectors through a CollectorSet
 */
export interface ICollectorSet {
  /**
   * Creates a usage collector to collect plugin telemetry data.
   * registerCollector must be called to connect the created collector with the service.
   */
  makeUsageCollector: <TFetchReturn, ExtraOptions extends object = {}>(
    options: UsageCollectorOptions<TFetchReturn, ExtraOptions>
  ) => Collector<TFetchReturn, ExtraOptions>;
  /**
   * Register a usage collector or a stats collector.
   * Used to connect the created collector to telemetry.
   */
  registerCollector: <TFetchReturn, ExtraOptions extends object>(
    collector: Collector<TFetchReturn, ExtraOptions>
  ) => void;
  /**
   * Returns a usage collector by type
   */
  getCollectorByType: <TFetchReturn, ExtraOptions extends object>(
    type: string
  ) => Collector<TFetchReturn, ExtraOptions> | undefined;
  /**
   * Fetches the collection from all the registered collectors
   * @internal: telemetry use
   */
  bulkFetch: <TFetchReturn, ExtraOptions extends object>(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    collectors?: Map<string, Collector<TFetchReturn, ExtraOptions>>
  ) => Promise<Array<{ type: string; result: unknown }>>;
  /**
   * Converts an array of fetched stats results into key/object
   * @internal: telemetry use
   */
  toObject: <Result extends Record<string, unknown>, T = unknown>(
    statsData?: Array<{ type: string; result: T }>
  ) => Result;
  /**
   * Rename fields to use API conventions
   * @internal: monitoring use
   */
  toApiFieldNames: (
    apiData: Record<string, unknown> | unknown[]
  ) => Record<string, unknown> | unknown[];
  /**
   * Creates a stats collector to collect plugin telemetry data.
   * registerCollector must be called to connect the created collector with the service.
   * @internal: telemetry and monitoring use
   */
  makeStatsCollector: <TFetchReturn, ExtraOptions extends object = {}>(
    options: CollectorOptions<TFetchReturn, ExtraOptions>
  ) => Collector<TFetchReturn, ExtraOptions>;
}

/**
 * Helper to find out whether to keep recursively looking or if we are on an end value
 */
export type RecursiveMakeSchemaFrom<U, RequireMeta> = U extends object
  ? Record<string, unknown> extends U
    ?
        | {
            // pass_through should only be allowed for Record<string, unknown> for now
            type: 'pass_through';
            _meta: {
              description: string; // Intentionally enforcing the descriptions here
            } & SchemaMetaOptional<U>;
          }
        | MakeSchemaFrom<U, RequireMeta> // But still allow being explicit in the definition if they want to.
    : MakeSchemaFrom<U, RequireMeta>
  : RequireMeta extends true
  ? { type: PossibleSchemaTypes<U>; _meta: { description: string } }
  : { type: PossibleSchemaTypes<U>; _meta?: { description: string } };

/**
 * The `schema` property in {@link CollectorOptions} must match the output of
 * the `fetch` method. This type helps ensure that is correct
 */
export type MakeSchemaFrom<Base, RequireMeta = false> = {
  // Using Required to enforce all optional keys in the object
  [Key in keyof Required<Base>]: Required<Base>[Key] extends Array<infer U>
    ? { type: 'array'; items: RecursiveMakeSchemaFrom<U, RequireMeta> }
    : RecursiveMakeSchemaFrom<Required<Base>[Key], RequireMeta>;
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
 * and the first parameter is {@link CollectorFetchContext}.
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
