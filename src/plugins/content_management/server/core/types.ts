/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type {
  Version,
  ContentManagementServiceTransforms,
  ContentManagementServiceDefinitionVersioned,
} from '@kbn/object-versioning';
import type { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';

import type {
  GetResult,
  BulkGetResult,
  CreateResult,
  UpdateResult,
  DeleteResult,
  SearchQuery,
  SearchResult,
} from '../../common';

export type StorageContextGetTransformFn = (
  definitions: ContentManagementServiceDefinitionVersioned,
  requestVersion?: Version
) => ContentManagementServiceTransforms;

/** Context that is sent to all storage instance methods */
export interface StorageContext {
  /** The Core HTTP request handler context */
  requestHandlerContext: RequestHandlerContext;
  version: {
    /**
     * The content type version for the request. It usually is the latest version although in some
     * cases the client (browser) might still be on an older version and make requests with that version.
     */
    request: Version;
    /**
     * The latest version of the content type. This is the version that the content type is currently on
     * after updating the Kibana server.
     */
    latest: Version;
  };
  utils: {
    /**
     * Get the transforms handlers for the content type.
     * The transforms are used to transform the content object to the latest schema (up) and back
     * to a previous schema (down).
     */
    getTransforms: StorageContextGetTransformFn;
  };
}

export interface ContentStorage<
  T = unknown,
  U = T,
  TMSearchConfig extends MSearchConfig<T, any> = MSearchConfig<T, unknown>
> {
  /** Get a single item */
  get(ctx: StorageContext, id: string, options?: object): Promise<GetResult<T, any>>;

  /** Get multiple items */
  bulkGet(ctx: StorageContext, ids: string[], options?: object): Promise<BulkGetResult<T, any>>;

  /** Create an item */
  create(ctx: StorageContext, data: object, options?: object): Promise<CreateResult<T, any>>;

  /** Update an item */
  update(
    ctx: StorageContext,
    id: string,
    data: object,
    options?: object
  ): Promise<UpdateResult<U, any>>;

  /** Delete an item */
  delete(ctx: StorageContext, id: string, options?: object): Promise<DeleteResult>;

  /** Search items */
  search(ctx: StorageContext, query: SearchQuery, options?: object): Promise<SearchResult<T>>;

  /**
   * Opt-in to multi-type search.
   * Can only be supported if the content type is backed by a saved object since `mSearch` is using the `savedObjects.find` API.
   **/
  mSearch?: TMSearchConfig;
}

export interface ContentTypeDefinition<S extends ContentStorage = ContentStorage> {
  /** Unique id for the content type */
  id: string;
  /** The storage layer for the content. It must implment the ContentStorage interface. */
  storage: S;
  version: {
    latest: Version;
  };
}

/**
 * A configuration for multi-type search.
 * By configuring a content type with a `MSearchConfig`, it can be searched in the multi-type search.
 * Underneath content management is using the `savedObjects.find` API to search the saved objects.
 */
export interface MSearchConfig<T = unknown, TSavedObjectAttributes = unknown> {
  /**
   * The saved object type that corresponds to this content type.
   */
  savedObjectType: string;

  /**
   * Mapper function that transforms the saved object into the content item result.
   */
  toItemResult: (
    ctx: StorageContext,
    savedObject: SavedObjectsFindResult<TSavedObjectAttributes>
  ) => T;

  /**
   * Additional fields to search on. These fields will be added to the search query.
   * By default, only `title` and `description` are searched.
   */
  additionalSearchFields?: string[];
}
