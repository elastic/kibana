/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsResolveResponse,
  SavedObjectsUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';

import type {
  GetIn,
  CreateIn,
  SearchIn,
  UpdateIn,
  DeleteIn,
} from '@kbn/content-management-plugin/common';

import { DataViewAttributes } from '../types';
import { DataViewContentType } from './constants';

interface Reference {
  type: string;
  id: string;
}

export type DataViewSavedObject = SavedObject<DataViewAttributes>;

// ----------- GET --------------

export type DataViewGetIn = GetIn<typeof DataViewContentType>;

export interface DataViewGetOut {
  savedObject: SavedObjectsResolveResponse<DataViewAttributes>['saved_object'];
  outcome: SavedObjectsResolveResponse['outcome'];
  aliasTargetId: SavedObjectsResolveResponse['alias_target_id'];
  aliasPurpose: SavedObjectsResolveResponse['alias_purpose'];
}

// ----------- CREATE --------------

export interface CreateOptions {
  /** If a document with the given `id` already exists, overwrite it's contents (default=false). */
  overwrite?: boolean;
  migrationVersion?: SavedObjectsMigrationVersion;
  /** A semver value that is used when upgrading objects between Kibana versions. */
  coreMigrationVersion?: string;
  /** Array of referenced saved objects. */
  references?: SavedObjectReference[];
}

export type DataViewCreateIn = CreateIn<
  typeof DataViewContentType,
  DataViewAttributes,
  CreateOptions
>;

export type DataViewCreateOut = DataViewSavedObject;

// ----------- UPDATE --------------

export interface UpdateOptions {
  /** Array of referenced saved objects. */
  references?: SavedObjectReference[];
}

export type DataViewUpdateIn = UpdateIn<
  typeof DataViewContentType,
  DataViewAttributes,
  UpdateOptions
>;

export type DataViewUpdateOut = SavedObjectsUpdateResponse<DataViewAttributes>;

// ----------- DELETE --------------

export type DataViewDeleteIn = DeleteIn<typeof DataViewContentType>;

export interface DataViewDeleteOut {
  status: 'success';
}

// ----------- SEARCH --------------

export interface MapSearchQuery {
  search?: string;
  fields?: string[];
  searchFields?: string[];
  perPage?: number;
  page?: number;
  defaultSearchOperator?: 'AND' | 'OR';
  hasReference?: Reference | Reference[];
  hasNoReference?: Reference | Reference[];
}

export type MapSearchIn = SearchIn<typeof DataViewContentType, MapSearchQuery>;

export interface MapSearchOut {
  /** current page in results*/
  page: number;
  /** number of results per page */
  perPage: number;
  /** total number of results */
  total: number;
  /** Array of simple saved objects */
  savedObjects: DataViewSavedObject[];
  /** aggregations from the search query */
  aggregations?: unknown; // TODO: Check if used in Maps
}
