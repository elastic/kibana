/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  Logger,
  ElasticsearchClient,
  ISavedObjectsRepository,
  SavedObjectsClientContract,
  KibanaRequest,
} from 'src/core/server';

export type AllowedSchemaNumberTypes = 'long' | 'integer' | 'short' | 'byte' | 'double' | 'float';

export type AllowedSchemaTypes = AllowedSchemaNumberTypes | 'keyword' | 'text' | 'boolean' | 'date';

export interface SchemaField {
  type: string;
}

export type RecursiveMakeSchemaFrom<U> = U extends object
  ? MakeSchemaFrom<U>
  : { type: AllowedSchemaTypes };

// Using Required to enforce all optional keys in the object
export type MakeSchemaFrom<Base> = {
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
export type CollectorFetchContext<WithKibanaRequest extends boolean | undefined = false> = {
  /**
   * Request-scoped Elasticsearch client
   * @remark Bear in mind when testing your collector that your user has the same privileges as the Kibana Internal user to ensure the expected data is sent to the remote cluster (more info: {@link CollectorFetchContext})
   */
  esClient: ElasticsearchClient;
  /**
   * Request-scoped Saved Objects client
   * @remark Bear in mind when testing your collector that your user has the same privileges as the Kibana Internal user to ensure the expected data is sent to the remote cluster (more info: {@link CollectorFetchContext})
   */
  soClient: SavedObjectsClientContract | ISavedObjectsRepository;
} & (WithKibanaRequest extends true
  ? {
      /**
       * The KibanaRequest that can be used to scope the requests:
       * It is provided only when your custom clients need to be scoped. If not available, you should use the Internal Client.
       * More information about when scoping is needed: {@link CollectorFetchContext}
       * @remark You should only use this if you implement your collector to deal with both scenarios: when provided and, especially, when not provided. When telemetry payload is sent to the remote service the `kibanaRequest` will not be provided.
       */
      kibanaRequest?: KibanaRequest;
    }
  : {});

export type CollectorFetchMethod<
  WithKibanaRequest extends boolean | undefined,
  TReturn,
  ExtraOptions extends object = {}
> = (
  this: Collector<TReturn> & ExtraOptions, // Specify the context of `this` for this.log and others to become available
  context: CollectorFetchContext<WithKibanaRequest>
) => Promise<TReturn> | TReturn;

export interface ICollectorOptionsFetchExtendedContext<WithKibanaRequest extends boolean> {
  /**
   * Set to `true` if your `fetch` method requires the `KibanaRequest` object to be added in its context {@link CollectorFetchContextWithRequest}.
   * @remark You should fully understand acknowledge that by using the `KibanaRequest` in your collector, you need to ensure it should specially work without it because it won't be provided when building the telemetry payload actually sent to the remote telemetry service.
   */
  kibanaRequest?: WithKibanaRequest;
}

export type CollectorOptionsFetchExtendedContext<
  WithKibanaRequest extends boolean
> = ICollectorOptionsFetchExtendedContext<WithKibanaRequest> &
  (WithKibanaRequest extends true // If enforced to true via Types, the config must be expected
    ? Required<Pick<ICollectorOptionsFetchExtendedContext<WithKibanaRequest>, 'kibanaRequest'>>
    : {});

export type CollectorOptions<
  TFetchReturn = unknown,
  WithKibanaRequest extends boolean = boolean,
  ExtraOptions extends object = {}
> = {
  /**
   * Unique string identifier for the collector
   */
  type: string;
  init?: Function;
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
  fetch: CollectorFetchMethod<WithKibanaRequest, TFetchReturn, ExtraOptions>;
} & ExtraOptions &
  (WithKibanaRequest extends true // If enforced to true via Types, the config must be enforced
    ? {
        extendFetchContext: CollectorOptionsFetchExtendedContext<WithKibanaRequest>;
      }
    : {
        extendFetchContext?: CollectorOptionsFetchExtendedContext<WithKibanaRequest>;
      });

export class Collector<TFetchReturn, ExtraOptions extends object = {}> {
  public readonly extendFetchContext: CollectorOptionsFetchExtendedContext<any>;
  public readonly type: CollectorOptions<TFetchReturn, any>['type'];
  public readonly init?: CollectorOptions<TFetchReturn, any>['init'];
  public readonly fetch: CollectorFetchMethod<any, TFetchReturn, ExtraOptions>;
  public readonly isReady: CollectorOptions<TFetchReturn, any>['isReady'];
  /**
   * @private Constructor of a Collector. It should be called via the CollectorSet factory methods: `makeStatsCollector` and `makeUsageCollector`
   * @param log {@link Logger}
   * @param collectorDefinition {@link CollectorOptions}
   */
  constructor(
    public readonly log: Logger,
    {
      type,
      init,
      fetch,
      isReady,
      extendFetchContext = {},
      ...options
    }: CollectorOptions<TFetchReturn, any, ExtraOptions>
  ) {
    if (type === undefined) {
      throw new Error('Collector must be instantiated with a options.type string property');
    }
    if (typeof init !== 'undefined' && typeof init !== 'function') {
      throw new Error(
        'If init property is passed, Collector must be instantiated with a options.init as a function property'
      );
    }
    if (typeof fetch !== 'function') {
      throw new Error('Collector must be instantiated with a options.fetch function property');
    }

    Object.assign(this, options); // spread in other properties and mutate "this"

    this.type = type;
    this.init = init;
    this.fetch = fetch;
    this.isReady = typeof isReady === 'function' ? isReady : () => true;
    this.extendFetchContext = extendFetchContext;
  }
}
