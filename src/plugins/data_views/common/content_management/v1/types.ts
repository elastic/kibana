/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';

import type {
  GetIn,
  CreateIn,
  SearchIn,
  UpdateIn,
  DeleteIn,
  SearchResult,
  GetResult,
  CreateResult,
} from '@kbn/content-management-plugin/common';

import { DataViewAttributes, DataViewSpec } from '../../types';
import { DataViewContentType } from '../constants';

export type DataViewSavedObject = SavedObject<DataViewAttributes>;

// ----------- GET --------------

export type DataViewGetIn = GetIn<typeof DataViewContentType>;

// todo this could use a good abstraction
export type DataViewGetOut = GetResult<
  DataViewSpec,
  {
    outcome: 'exactMatch' | 'aliasMatch' | 'conflict';
    aliasTargetId?: string;
    aliasPurpose?: 'savedObjectConversion' | 'savedObjectImport';
  }
>;

// ----------- CREATE --------------

export interface CreateOptions {
  /** If a document with the given `id` already exists, overwrite it's contents (default=false). */
  id?: string;
  overwrite?: boolean;
  migrationVersion?: SavedObjectsMigrationVersion;
  /** A semver value that is used when upgrading objects between Kibana versions. */
  coreMigrationVersion?: string;
  /** Array of referenced saved objects. */
  references?: SavedObjectReference[];
}

export type DataViewCreateIn = CreateIn<
  typeof DataViewContentType,
  Omit<DataViewSpec, 'fields'>,
  CreateOptions
>;

export type DataViewCreateOut = CreateResult<DataViewSpec>;

// ----------- UPDATE --------------

export interface DataViewUpdateOptions {
  /** Array of referenced saved objects. */
  references?: SavedObjectReference[];
  version?: string;
}

export type DataViewUpdateIn = UpdateIn<
  typeof DataViewContentType,
  DataViewSpec,
  DataViewUpdateOptions
>;

export type DataViewUpdateOut = DataViewSpec;

// ----------- DELETE --------------

export type DataViewDeleteIn = DeleteIn<typeof DataViewContentType>;

export interface DataViewDeleteOut {
  status: 'success';
}

// ----------- SEARCH --------------

export type DataViewSearchIn = SearchIn<typeof DataViewContentType>;

export type DataViewSearchOut = SearchResult<DataViewSpec>;
