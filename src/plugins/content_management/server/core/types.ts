/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type {
  Version,
  ContentManagementServiceTransforms,
  ContentManagementServiceDefinitionVersioned,
} from '@kbn/object-versioning';
import type { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

import type {
  GetResult,
  BulkGetResult,
  CreateResult,
  UpdateResult,
  DeleteResult,
  SearchQuery,
  SearchResult,
} from '../../common';
import { SearchIndexDoc } from '../search_index/types';

export type StorageContextGetTransformFn = (
  definitions: ContentManagementServiceDefinitionVersioned,
  requestVersion?: Version
) => ContentManagementServiceTransforms;

/** Context that is sent to all storage instance methods */
export interface StorageContext {
  requestHandlerContext: RequestHandlerContext;
  currentUser: AuthenticatedUser | null;
  version: {
    request: Version;
    latest: Version;
  };
  utils: {
    getTransforms: StorageContextGetTransformFn;
    generateId: () => string;
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
  create(
    ctx: StorageContext,
    data: object,
    options: { id: string; [key: string]: unknown }
  ): Promise<CreateResult<T, any>>;

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
  contentIdGenerator?: () => string;
  searchIndex?: {
    parser: <T = unknown>(item: T) => Pick<SearchIndexDoc, 'title' | 'description'>;
  };
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
