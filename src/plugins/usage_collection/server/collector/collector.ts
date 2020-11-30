/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  Logger,
  LegacyAPICaller,
  ElasticsearchClient,
  ISavedObjectsRepository,
  SavedObjectsClientContract,
  KibanaRequest,
} from 'src/core/server';

export type CollectorFormatForBulkUpload<T, U> = (result: T) => { type: string; payload: U };

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
   * @deprecated Scoped Legacy Elasticsearch client: use esClient instead
   */
  callCluster: LegacyAPICaller;
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
  this: Collector<TReturn, unknown> & ExtraOptions, // Specify the context of `this` for this.log and others to become available
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
  UFormatBulkUploadPayload = TFetchReturn, // TODO: Once we remove bulk_uploader's dependency on usageCollection, we'll be able to remove this type
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
  /**
   * A hook for allowing the fetched data payload to be organized into a typed
   * data model for internal bulk upload. See defaultFormatterForBulkUpload for
   * a generic example.
   * @deprecated Used only by the Legacy Monitoring collection (to be removed in 8.0)
   */
  formatForBulkUpload?: CollectorFormatForBulkUpload<TFetchReturn, UFormatBulkUploadPayload>;
} & ExtraOptions &
  (WithKibanaRequest extends true // If enforced to true via Types, the config must be enforced
    ? {
        extendFetchContext: CollectorOptionsFetchExtendedContext<WithKibanaRequest>;
      }
    : {
        extendFetchContext?: CollectorOptionsFetchExtendedContext<WithKibanaRequest>;
      });

export class Collector<
  TFetchReturn,
  UFormatBulkUploadPayload = TFetchReturn,
  ExtraOptions extends object = {}
> {
  public readonly extendFetchContext: CollectorOptionsFetchExtendedContext<any>;
  public readonly type: CollectorOptions<TFetchReturn, UFormatBulkUploadPayload, any>['type'];
  public readonly init?: CollectorOptions<TFetchReturn, UFormatBulkUploadPayload, any>['init'];
  public readonly fetch: CollectorFetchMethod<any, TFetchReturn, ExtraOptions>;
  public readonly isReady: CollectorOptions<TFetchReturn, UFormatBulkUploadPayload, any>['isReady'];
  private readonly _formatForBulkUpload?: CollectorFormatForBulkUpload<
    TFetchReturn,
    UFormatBulkUploadPayload
  >;
  /*
   * @param {Object} logger - logger object
   * @param {String} options.type - property name as the key for the data
   * @param {Function} options.init (optional) - initialization function
   * @param {Function} options.fetch - function to query data
   * @param {Function} options.formatForBulkUpload - optional
   * @param {Function} options.isReady - method that returns a boolean or Promise of a boolean to indicate the collector is ready to report data
   * @param {Function} options.rest - optional other properties
   */
  constructor(
    public readonly log: Logger,
    {
      type,
      init,
      fetch,
      formatForBulkUpload,
      isReady,
      extendFetchContext = {},
      ...options
    }: CollectorOptions<TFetchReturn, UFormatBulkUploadPayload, any, ExtraOptions>
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
    this._formatForBulkUpload = formatForBulkUpload;
  }

  public formatForBulkUpload(result: TFetchReturn) {
    if (this._formatForBulkUpload) {
      return this._formatForBulkUpload(result);
    } else {
      return this.defaultFormatterForBulkUpload(result);
    }
  }

  protected defaultFormatterForBulkUpload(result: TFetchReturn) {
    return {
      type: this.type,
      payload: (result as unknown) as UFormatBulkUploadPayload,
    };
  }
}
