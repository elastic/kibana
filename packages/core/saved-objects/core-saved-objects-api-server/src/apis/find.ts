/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SortOrder,
  AggregationsAggregationContainer,
  Id as EsId,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SavedObject } from '@kbn/core-saved-objects-common';

type KueryNode = any;

/**
 * @public
 */
export interface SavedObjectsFindOptionsReference {
  type: string;
  id: string;
}

/**
 * @public
 */
export interface SavedObjectsPitParams {
  id: string;
  keepAlive?: string;
}

/**
 *
 * @public
 */
export interface SavedObjectsFindOptions {
  type: string | string[];
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: SortOrder;
  /**
   * An array of fields to include in the results
   * @example
   * SavedObjects.find({type: 'dashboard', fields: ['attributes.name', 'attributes.location']})
   */
  fields?: string[];
  /** Search documents using the Elasticsearch Simple Query String syntax. See Elasticsearch Simple Query String `query` argument for more information */
  search?: string;
  /** The fields to perform the parsed query against. See Elasticsearch Simple Query String `fields` argument for more information */
  searchFields?: string[];
  /**
   * Use the sort values from the previous page to retrieve the next page of results.
   */
  searchAfter?: EsId[];
  /**
   * The fields to perform the parsed query against. Unlike the `searchFields` argument, these are expected to be root fields and will not
   * be modified. If used in conjunction with `searchFields`, both are concatenated together.
   */
  rootSearchFields?: string[];

  /**
   * Search for documents having a reference to the specified objects.
   * Use `hasReferenceOperator` to specify the operator to use when searching for multiple references.
   */
  hasReference?: SavedObjectsFindOptionsReference | SavedObjectsFindOptionsReference[];

  /**
   * The operator to use when searching by multiple references using the `hasReference` option. Defaults to `OR`
   */
  hasReferenceOperator?: 'AND' | 'OR';

  /**
   * Search for documents *not* having a reference to the specified objects.
   * Use `hasNoReferenceOperator` to specify the operator to use when searching for multiple references.
   */
  hasNoReference?: SavedObjectsFindOptionsReference | SavedObjectsFindOptionsReference[];

  /**
   * The operator to use when searching by multiple references using the `hasNoReference` option. Defaults to `OR`
   */
  hasNoReferenceOperator?: 'AND' | 'OR';

  /**
   * The search operator to use with the provided filter. Defaults to `OR`
   */
  defaultSearchOperator?: 'AND' | 'OR';
  filter?: string | KueryNode;
  /**
   * A record of aggregations to perform.
   * The API currently only supports a limited set of metrics and bucket aggregation types.
   * Additional aggregation types can be contributed to Core.
   *
   * @example
   * Aggregating on SO attribute field
   * ```ts
   * const aggs = { latest_version: { max: { field: 'dashboard.attributes.version' } } };
   * return client.find({ type: 'dashboard', aggs })
   * ```
   *
   * @example
   * Aggregating on SO root field
   * ```ts
   * const aggs = { latest_update: { max: { field: 'dashboard.updated_at' } } };
   * return client.find({ type: 'dashboard', aggs })
   * ```
   *
   * @alpha
   */
  aggs?: Record<string, AggregationsAggregationContainer>;
  namespaces?: string[];
  /**
   * This map defines each type to search for, and the namespace(s) to search for the type in; this is only intended to be used by a saved
   * object client wrapper.
   * If this is defined, it supersedes the `type` and `namespaces` fields when building the Elasticsearch query.
   * Any types that are not included in this map will be excluded entirely.
   * If a type is included but its value is undefined, the operation will search for that type in the Default namespace.
   */
  typeToNamespacesMap?: Map<string, string[] | undefined>;
  /** An optional ES preference value to be used for the query **/
  preference?: string;
  /**
   * Search against a specific Point In Time (PIT) that you've opened with {@link SavedObjectsClient.openPointInTimeForType}.
   */
  pit?: SavedObjectsPitParams;
}

/**
 *
 * @public
 */
export interface SavedObjectsFindResult<T = unknown> extends SavedObject<T> {
  /**
   * The Elasticsearch `_score` of this result.
   */
  score: number;
  /**
   * The Elasticsearch `sort` value of this result.
   *
   * @remarks
   * This can be passed directly to the `searchAfter` param in the {@link SavedObjectsFindOptions}
   * in order to page through large numbers of hits. It is recommended you use this alongside
   * a Point In Time (PIT) that was opened with {@link SavedObjectsClient.openPointInTimeForType}.
   *
   * @example
   * ```ts
   * const { id } = await savedObjectsClient.openPointInTimeForType('visualization');
   * const page1 = await savedObjectsClient.find({
   *   type: 'visualization',
   *   sortField: 'updated_at',
   *   sortOrder: 'asc',
   *   pit: { id },
   * });
   * const lastHit = page1.saved_objects[page1.saved_objects.length - 1];
   * const page2 = await savedObjectsClient.find({
   *   type: 'visualization',
   *   sortField: 'updated_at',
   *   sortOrder: 'asc',
   *   pit: { id: page1.pit_id },
   *   searchAfter: lastHit.sort,
   * });
   * await savedObjectsClient.closePointInTime(page2.pit_id);
   * ```
   */
  sort?: string[];
}

/**
 * Return type of the Saved Objects `find()` method.
 *
 * *Note*: this type is different between the Public and Server Saved Objects
 * clients.
 *
 * @public
 */
export interface SavedObjectsFindResponse<T = unknown, A = unknown> {
  aggregations?: A;
  saved_objects: Array<SavedObjectsFindResult<T>>;
  total: number;
  per_page: number;
  page: number;
  pit_id?: string;
}
