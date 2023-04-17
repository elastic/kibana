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

export interface Reference {
  type: string;
  id: string;
  name: string;
}

export interface CreateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export interface SearchOptions {
  /** Flag to indicate to only search the text on the "title" field */
  onlyTitle?: boolean;
}

export interface UpdateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export type GetResultSO<Item extends object> = GetResult<
  Item,
  {
    outcome: 'exactMatch' | 'aliasMatch' | 'conflict';
    aliasTargetId?: string;
    aliasPurpose?: 'savedObjectConversion' | 'savedObjectImport';
  }
>;

/**
 * Saved object with metadata
 */
export interface SOWithMetadata<Attributes extends object> {
  id: string;
  type: string;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
  error?: {
    error: string;
    message: string;
    statusCode: number;
    metadata?: Record<string, unknown>;
  };
  attributes: Attributes;
  references: Reference[];
  namespaces?: string[];
  originId?: string;
}

type PartialItem<Attributes extends object> = Omit<
  SOWithMetadata<Attributes>,
  'attributes' | 'references'
> & {
  attributes: Partial<Attributes>;
  references: Reference[] | undefined;
};

/**
 * Types used by content management storage
 * @argument ContentType - content management type. assumed to be the same as saved object type
 * @argument Attributes - attributes of the saved object
 */
export interface ContentManagementCrudTypes<ContentType extends string, Attributes extends object> {
  /**
   * Complete saved object
   */
  Item: SOWithMetadata<Attributes>;
  /**
   * Partial saved object, used as output for update
   */
  PartialItem: PartialItem<Attributes>;
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
   * Create options
   */
  CreateOptions: CreateOptions;

  /**
   * Search item params
   */
  SearchIn: SearchIn<ContentType, SearchOptions>;
  /**
   * Search item result
   */
  SearchOut: SearchResult<SOWithMetadata<Attributes>>;
  /**
   * Search options
   */
  SearchOptions: SearchOptions;

  /**
   * Update item params
   */
  UpdateIn: UpdateIn<ContentType, Attributes, UpdateOptions>;
  /**
   * Update item result
   */
  UpdateOut: UpdateResult<PartialItem<Attributes>>;
  /**
   * Update options
   */
  UpdateOptions: UpdateOptions;

  /**
   * Delete item params
   */
  DeleteIn: DeleteIn<ContentType>;
  /**
   * Delete item result
   */
  DeleteOut: DeleteResult;
}
