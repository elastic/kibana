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
} from 'kibana/server';

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

export interface CollectorFetchContext {
  /**
   * @depricated Scoped Legacy Elasticsearch client: use esClient instead
   */
  callCluster: LegacyAPICaller;
  /**
   * Request-scoped Elasticsearch client:
   * - When users are requesting a sample of data, it is scoped to their role to avoid exposing data they should't read
   * - When building the telemetry data payload to report to the remote cluster, the requests are scoped to the `kibana` internal user
   */
  esClient: ElasticsearchClient;
  /**
   * Request-scoped Saved Objects client:
   * - When users are requesting a sample of data, it is scoped to their role to avoid exposing data they should't read
   * - When building the telemetry data payload to report to the remote cluster, the requests are scoped to the `kibana` internal user
   */
  soClient: SavedObjectsClientContract | ISavedObjectsRepository;
}

export interface CollectorOptions<T = unknown, U = T> {
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
  schema?: MakeSchemaFrom<T>;
  fetch: (collectorFetchContext: CollectorFetchContext) => Promise<T> | T;
  /*
   * A hook for allowing the fetched data payload to be organized into a typed
   * data model for internal bulk upload. See defaultFormatterForBulkUpload for
   * a generic example.
   * @deprecated Used only by the Legacy Monitoring collection (to be removed in 8.0)
   */
  formatForBulkUpload?: CollectorFormatForBulkUpload<T, U>;
}

export class Collector<T = unknown, U = T> {
  public readonly type: CollectorOptions<T, U>['type'];
  public readonly init?: CollectorOptions<T, U>['init'];
  public readonly fetch: CollectorOptions<T, U>['fetch'];
  private readonly _formatForBulkUpload?: CollectorFormatForBulkUpload<T, U>;
  public readonly isReady: CollectorOptions<T, U>['isReady'];
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
    protected readonly log: Logger,
    { type, init, fetch, formatForBulkUpload, isReady, ...options }: CollectorOptions<T, U>
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
    this._formatForBulkUpload = formatForBulkUpload;
  }

  public formatForBulkUpload(result: T) {
    if (this._formatForBulkUpload) {
      return this._formatForBulkUpload(result);
    } else {
      return this.defaultFormatterForBulkUpload(result);
    }
  }

  protected defaultFormatterForBulkUpload(result: T) {
    return {
      type: this.type,
      payload: (result as unknown) as U,
    };
  }
}
