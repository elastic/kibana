/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  GetIn,
  CreateIn,
  SearchIn,
  UpdateIn,
  DeleteIn,
  DeleteResult,
  SearchResult,
  GetResult,
  CreateResult,
  UpdateResult,
} from '@kbn/content-management-plugin/common';
import type { ContentManagementCrudTypes } from '@kbn/content-management-utils';

import { VisualizationContentType } from '../types';

export interface Reference {
  type: string;
  id: string;
  name: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VisualizationSavedObjectAttributes = {
  title: string;
  description?: string;
  kibanaSavedObjectMeta?: {
    searchSourceJSON?: string;
  };
  version?: string;
  visState?: string;
  uiStateJSON?: string;
  savedSearchRefName?: string;
};

export interface VisualizationSavedObject {
  id: string;
  type: string;
  version?: string;
  updatedAt?: string;
  createdAt?: string;
  attributes: VisualizationSavedObjectAttributes;
  references: Reference[];
  namespaces?: string[];
  originId?: string;
  error?: {
    error: string;
    message: string;
    statusCode: number;
    metadata?: Record<string, unknown>;
  };
  managed?: boolean;
}

export type PartialVisualizationSavedObject = Omit<
  VisualizationSavedObject,
  'attributes' | 'references'
> & {
  attributes: Partial<VisualizationSavedObjectAttributes>;
  references: Reference[] | undefined;
};
// ----------- GET --------------

export type VisualizationGetIn = GetIn<VisualizationContentType>;

export type VisualizationGetOut = GetResult<
  VisualizationSavedObject,
  {
    outcome: 'exactMatch' | 'aliasMatch' | 'conflict';
    aliasTargetId?: string;
    aliasPurpose?: 'savedObjectConversion' | 'savedObjectImport';
  }
>;

// ----------- CREATE --------------

export interface CreateOptions {
  /** If a document with the given `id` already exists, overwrite it's contents (default=false). */
  overwrite?: boolean;
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export type VisualizationCreateIn = CreateIn<
  VisualizationContentType,
  VisualizationSavedObjectAttributes,
  CreateOptions
>;

export type VisualizationCreateOut = CreateResult<VisualizationSavedObject>;

// ----------- UPDATE --------------

export interface UpdateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
  overwrite?: boolean;
}

export type VisualizationUpdateIn = UpdateIn<
  VisualizationContentType,
  VisualizationSavedObjectAttributes,
  UpdateOptions
>;

export type VisualizationUpdateOut = UpdateResult<PartialVisualizationSavedObject>;

// ----------- DELETE --------------

export type VisualizationDeleteIn = DeleteIn<VisualizationContentType>;

export type VisualizationDeleteOut = DeleteResult;

// ----------- SEARCH --------------

export interface VisualizationSearchQuery {
  types?: string[];
  searchFields?: string[];
}

export type VisualizationSearchIn = SearchIn<VisualizationContentType, {}>;

export type VisualizationSearchOut = SearchResult<VisualizationSavedObject>;

// ----------- CRUD TYPES --------------

export type VisualizationCrudTypes = ContentManagementCrudTypes<
  VisualizationContentType,
  VisualizationSavedObjectAttributes,
  CreateOptions,
  UpdateOptions,
  {}
>;
