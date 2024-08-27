/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  GetIn,
  GetResult,
  CreateIn,
  CreateResult,
  SearchIn,
  SearchResult,
  UpdateIn,
  UpdateResult,
  DeleteIn,
  DeleteResult,
} from '@kbn/content-management-plugin/common';

import type {
  ContentManagementServicesDefinition as ServicesDefinition,
  Version,
} from '@kbn/object-versioning';

export interface ServicesDefinitionSet {
  [version: Version]: ServicesDefinition;
}

import type {
  SortOrder,
  AggregationsAggregationContainer,
  SortResults,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type {
  MutatingOperationRefreshSetting,
  SavedObjectsPitParams,
  SavedObjectsFindOptionsReference,
} from '@kbn/core-saved-objects-api-server';

type KueryNode = any;

export interface Reference {
  type: string;
  id: string;
  name: string;
}

/** Saved Object create options - Pick and Omit to customize */
export interface SavedObjectCreateOptions {
  /** (not recommended) Specify an id for the document */
  id?: string;
  /** Overwrite existing documents (defaults to false) */
  overwrite?: boolean;
  /**
   * An opaque version number which changes on each successful write operation.
   * Can be used in conjunction with `overwrite` for implementing optimistic concurrency control.
   **/
  version?: string;
  /** Array of referenced saved objects. */
  references?: Reference[];
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: boolean;
  /**
   * Optional initial namespaces for the object to be created in. If this is defined, it will supersede the namespace ID that is in
   * {@link SavedObjectsCreateOptions}.
   *
   * * For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
   *   including the "All spaces" identifier (`'*'`).
   * * For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
   *   be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
   * * For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.
   */
  initialNamespaces?: string[];
}

/** Saved Object search options - Pick and Omit to customize */
export interface SavedObjectSearchOptions {
  /** the page of results to return */
  page?: number;
  /** the number of objects per page */
  perPage?: number;
  /** which field to sort by */
  sortField?: string;
  /** sort order, ascending or descending */
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
  searchAfter?: SortResults;
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
  /** filter string for the search query */
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
  /** array of namespaces to search */
  namespaces?: string[];
  /**
   * Search against a specific Point In Time (PIT) that you've opened with {@link SavedObjectsClient.openPointInTimeForType}.
   */
  pit?: SavedObjectsPitParams;
}

/** Saved Object update options  - Pick and Omit to customize */
export interface SavedObjectUpdateOptions<Attributes = unknown> {
  /** Array of referenced saved objects. */
  references?: Reference[];
  version?: string;
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
  /** If specified, will be used to perform an upsert if the object doesn't exist */
  upsert?: Attributes;
  /**
   * The Elasticsearch `retry_on_conflict` setting for this operation.
   * Defaults to `0` when `version` is provided, `3` otherwise.
   */
  retryOnConflict?: number;
  /**
   * By default, update will merge the provided attributes with the ones present on the document
   * (performing a standard partial update). Setting this option to `false` will change the behavior, performing
   * a "full" update instead, where the provided attributes will fully replace the existing ones.
   * Defaults to `true`.
   */
  mergeAttributes?: boolean;
}

/** Return value for Saved Object get, T is item returned */
export type GetResultSO<T extends object = object> = GetResult<
  T,
  {
    outcome: 'exactMatch' | 'aliasMatch' | 'conflict';
    aliasTargetId?: string;
    aliasPurpose?: 'savedObjectConversion' | 'savedObjectImport';
  }
>;

/**
 * Saved object with metadata
 */
export interface SOWithMetadata<Attributes extends object = object> {
  id: string;
  type: string;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  error?: {
    error: string;
    message: string;
    statusCode: number;
    metadata?: Record<string, unknown>;
  };
  managed?: boolean;
  attributes: Attributes;
  references: Reference[];
  namespaces?: string[];
  originId?: string;
}

export type SOWithMetadataPartial<Attributes extends object = object> = Omit<
  SOWithMetadata<Attributes>,
  'attributes' | 'references'
> & {
  attributes: Partial<Attributes>;
  references: Reference[] | undefined;
};

export interface CMCrudTypes {
  /**
   * Saved object attributes
   */
  Attributes: object;
  /**
   * Complete saved object
   */
  Item: SOWithMetadata;
  /**
   * Partial saved object, used as output for update
   */
  PartialItem: SOWithMetadataPartial;

  /**
   * Get item params
   */
  GetIn: GetIn;
  /**
   * Get item result
   */
  GetOut: GetResultSO<SOWithMetadata>;
  /**
   * Create item params
   */
  CreateIn: CreateIn;
  /**
   * Create item result
   */
  CreateOut: CreateResult<SOWithMetadata>;
  /**
   *
   */
  CreateOptions: object;

  /**
   * Search item params
   */
  SearchIn: SearchIn;
  /**
   * Search item result
   */
  SearchOut: SearchResult<SOWithMetadata>;
  /**
   *
   */
  SearchOptions: object;

  /**
   * Update item params
   */
  UpdateIn: UpdateIn;
  /**
   * Update item result
   */
  UpdateOut: UpdateResult<SOWithMetadataPartial>;
  /**
   *
   */
  UpdateOptions: object;

  /**
   * Delete item params
   */
  DeleteIn: DeleteIn;
  /**
   * Delete item result
   */
  DeleteOut: DeleteResult;
}

/**
 * Types used by content management storage
 * @argument ContentType - content management type. assumed to be the same as saved object type
 * @argument Attributes - attributes of the saved object
 */
export interface ContentManagementCrudTypes<
  ContentType extends string,
  Attributes extends object,
  CreateOptions extends object,
  UpdateOptions extends object,
  SearchOptions extends object
> {
  Attributes: Attributes;
  /**
   * Complete saved object
   */
  Item: SOWithMetadata<Attributes>;
  /**
   * Partial saved object, used as output for update
   */
  PartialItem: SOWithMetadataPartial<Attributes>;
  /**
   * Create options
   */
  CreateOptions: CreateOptions;
  /**
   * Update options
   */
  UpdateOptions: UpdateOptions;
  /**
   * Search options
   */
  SearchOptions: SearchOptions;
  /**
   * Get item params
   */
  GetIn: GetIn<ContentType>;
  /**
   * Get item result
   */
  GetOut: GetResultSO<SOWithMetadata<Attributes>>;
  /**
   * Create item params
   */
  CreateIn: CreateIn<ContentType, Attributes, CreateOptions>;
  /**
   * Create item result
   */
  CreateOut: CreateResult<SOWithMetadata<Attributes>>;

  /**
   * Search item params
   */
  SearchIn: SearchIn<ContentType, SearchOptions>;
  /**
   * Search item result
   */
  SearchOut: SearchResult<SOWithMetadata<Attributes>>;

  /**
   * Update item params
   */
  UpdateIn: UpdateIn<ContentType, Partial<Attributes>, UpdateOptions>;
  /**
   * Update item result
   */
  UpdateOut: UpdateResult<SOWithMetadataPartial<Attributes>>;

  /**
   * Delete item params
   */
  DeleteIn: DeleteIn<ContentType>;
  /**
   * Delete item result
   */
  DeleteOut: DeleteResult;
}
