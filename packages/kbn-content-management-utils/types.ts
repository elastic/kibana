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

interface Reference {
  type: string;
  id: string;
  name: string;
}

export interface CreateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
  overwrite?: boolean;
  id?: string;
}

export interface SearchOptions {
  /** Flag to indicate to only search the text on the "title" field */
  onlyTitle?: boolean;
  searchFields?: string[];
}

export interface UpdateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
  version?: string;
}

export type GetResultSO<Item extends object> = GetResult<
  Item,
  {
    outcome: 'exactMatch' | 'aliasMatch' | 'conflict';
    aliasTargetId?: string;
    aliasPurpose?: 'savedObjectConversion' | 'savedObjectImport';
  }
>;

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

export type PartialItem<Attributes extends object> = Omit<
  SOWithMetadata<Attributes>,
  'attributes' | 'references'
> & {
  attributes: Partial<Attributes>;
  references: Reference[] | undefined;
};

export interface ContentManagementCrudTypes<ContentType extends string, Attributes extends object> {
  Item: SOWithMetadata<Attributes>;
  PartialItem: PartialItem<Attributes>;

  GetIn: GetIn<ContentType>;
  GetOut: GetResultSO<SOWithMetadata<Attributes>>;

  CreateIn: CreateIn<ContentType, Attributes, CreateOptions>;
  CreateOut: CreateResult<SOWithMetadata<Attributes>>;

  SearchIn: SearchIn<ContentType, SearchOptions>;
  SearchOut: SearchResult<SOWithMetadata<Attributes>>;

  UpdateIn: UpdateIn<ContentType, Attributes, UpdateOptions>;
  UpdateOut: UpdateResult<PartialItem<Attributes>>;

  DeleteIn: DeleteIn<ContentType>;

  DeleteOut: DeleteResult;
}
