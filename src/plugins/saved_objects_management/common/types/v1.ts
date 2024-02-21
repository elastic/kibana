/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectError } from '@kbn/core/types';
import type { SavedObjectsNamespaceType } from '@kbn/core/public';

/** Domain interfaces */

/**
 * Saved Object Management metadata associated with a saved object. See
 * {@link SavedObjectWithMetadata}.
 */
export interface SavedObjectMetadata {
  icon?: string;
  title?: string;
  editUrl?: string;
  inAppUrl?: { path: string; uiCapabilitiesPath: string };
  namespaceType?: SavedObjectsNamespaceType;
  hiddenType?: boolean;
}

/**
 * One saved object's reference to another saved object.
 */
export interface SavedObjectReference {
  name: string;
  type: string;
  id: string;
}

/**
 * A saved object.
 *
 * @note This is intended as a domain-specific representation of a SavedObject
 * which is intended for server-side only use.
 */
export interface SavedObjectWithMetadata<T = unknown> {
  id: string;
  type: string;
  meta: SavedObjectMetadata;
  error?: SavedObjectError;
  created_at?: string;
  updated_at?: string;
  managed?: boolean;
  attributes: T;
  namespaces?: string[];
  references: SavedObjectReference[];
}

export type SavedObjectRelationKind = 'child' | 'parent';

/**
 * Represents a relation between two {@link SavedObjectWithMetadata | saved objects}.
 */
export interface SavedObjectRelation {
  id: string;
  type: string;
  relationship: SavedObjectRelationKind;
  meta: SavedObjectMetadata;
}

/**
 * Represents a relation between two {@link SavedObjectWithMetadata | saved objects}.
 */
export interface SavedObjectInvalidRelation {
  id: string;
  type: string;
  relationship: SavedObjectRelationKind;
  error: string;
}

export interface SavedObjectManagementTypeInfo {
  name: string;
  namespaceType: SavedObjectsNamespaceType;
  hidden: boolean;
  displayName: string;
}

/** HTTP API interfaces */

export type BulkGetBodyHTTP = Array<{
  id: string;
  type: string;
}>;

export type BulkGetResponseHTTP = SavedObjectWithMetadata[];

export type BulkDeleteBodyHTTP = Array<{
  type: string;
  id: string;
}>;

export type BulkDeleteResponseHTTP = Array<{
  /** The ID of the saved object */
  id: string;
  /** The type of the saved object */
  type: string;
  /** The status of deleting the object: true for deleted, false for error */
  success: boolean;
  /** Reason the object could not be deleted (success is false) */
  error?: SavedObjectError;
}>;

export type FindSearchOperatorHTTP = 'AND' | 'OR';
export type FindSortOrderHTTP = 'asc' | 'desc';

export interface ReferenceHTTP {
  type: string;
  id: string;
}

export interface FindQueryHTTP {
  perPage?: number;
  page?: number;
  type: string | string[];
  /**
   * SO's can register one or more "defaultSearchField"'s against which this query will run using the
   * {@link SavedObjectsFindOptions['searchFields'] | search fields} option.
   *
   * Therefore we are not directly exposing SO attributes to the public here.
   */
  search?: string;
  defaultSearchOperator?: FindSearchOperatorHTTP;
  sortField?: keyof SavedObjectWithMetadata;
  sortOrder?: FindSortOrderHTTP;
  hasReference?: ReferenceHTTP | ReferenceHTTP[];
  hasReferenceOperator?: FindSearchOperatorHTTP;
}

export interface FindResponseHTTP {
  saved_objects: SavedObjectWithMetadata[];
  total: number;
  page: number;
  per_page: number;
}

export interface GetAllowedTypesResponseHTTP {
  types: SavedObjectManagementTypeInfo[];
}

export interface RelationshipsParamsHTTP {
  type: string;
  id: string;
}

export interface RelationshipsQueryHTTP {
  size: number;
  savedObjectTypes: string | string[];
}

export interface RelationshipsResponseHTTP {
  relations: SavedObjectRelation[];
  invalidRelations: SavedObjectInvalidRelation[];
}

export interface ScrollCountBodyHTTP {
  typesToInclude: string[];
  // TODO: Fix. this API allows writing an arbitrary query that is passed straight to our persistence layer, thus leaking SO attributes to the public...
  searchString?: string;
  references?: Array<{ type: string; id: string }>;
}

export interface DeleteObjectBodyHTTP {
  id: string;
  type: string;
}

export interface DeleteObjectResponseHTTP {
  id: string;
}

/**
 * In this case "string" is a direct mapping from "typesToInlcude" in {@link ScrollCountBodyHTTP['typesToInclude']']}
 */
export type ScrollCountResponseHTTP = Record<string, number>;
