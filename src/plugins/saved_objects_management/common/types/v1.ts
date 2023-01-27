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
 * {@link SavedObjectWithMetadataV1}.
 */
export interface SavedObjectMetadataV1 {
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
export interface SavedObjectReferenceV1 {
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
export interface SavedObjectWithMetadataV1<T = unknown> {
  id: string;
  type: string;
  meta: SavedObjectMetadataV1;
  error?: SavedObjectError;
  created_at?: string;
  updated_at?: string;
  attributes: T;
  namespaces?: string[];
  references: SavedObjectReferenceV1[];
}

export type SavedObjectRelationKindV1 = 'child' | 'parent';

/**
 * {@inheritdoc SavedObjectRelation}
 */
export interface SavedObjectRelationV1 {
  id: string;
  type: string;
  relationship: SavedObjectRelationKindV1;
  meta: SavedObjectMetadataV1;
}

/**
 * Represents a relation between two {@link SavedObject | saved object}
 */
export type SavedObjectRelation = SavedObjectRelationV1;

/**
 * {@inheritdoc SavedObjectInvalidRelation}
 */
export interface SavedObjectInvalidRelationV1 {
  id: string;
  type: string;
  relationship: SavedObjectRelationKindV1;
  error: string;
}

/**
 * Represents a relation between two {@link SavedObject | saved object}
 */
export type SavedObjectInvalidRelation = SavedObjectInvalidRelationV1;

export type SavedObjectGetRelationshipsResponseV1 = RelationshipsResponseHTTPV1;

export interface SavedObjectManagementTypeInfoV1 {
  name: string;
  // TODO: Fix. We should not directly expose these values to public code.
  namespaceType: SavedObjectsNamespaceType;
  hidden: boolean;
  displayName: string;
}
export type SavedObjectManagementTypeInfo = SavedObjectManagementTypeInfoV1;

/** HTTP API interfaces */

export type BulkGetHTTPBodyV1 = Array<{
  id: string;
  type: string;
}>;

export type BulkGetHTTPResponseV1 = SavedObjectWithMetadataV1[];

export type BulkDeleteHTTPBodyV1 = Array<{
  type: string;
  id: string;
}>;

export type BulkDeleteHTTPResponseV1 = Array<{
  /** The ID of the saved object */
  id: string;
  /** The type of the saved object */
  type: string;
  /** The status of deleting the object: true for deleted, false for error */
  success: boolean;
  /** Reason the object could not be deleted (success is false) */
  error?: SavedObjectError;
}>;

export type FindSearchOperatorHTTPV1 = 'AND' | 'OR';
export type FindSortOrderHTTPV1 = 'asc' | 'desc';

export interface ReferenceHTTPV1 {
  type: string;
  id: string;
}

export interface FindQueryHTTPV1 {
  perPage?: number;
  page?: number;
  type: string | string[];
  // TODO: Fix. this API allows writing an arbitrary query that is passed straight to our persistence layer, thus leaking SO attributes to the public...
  search?: string;
  defaultSearchOperator?: FindSearchOperatorHTTPV1;
  // TODO: Fix. this API allows sorting by any field, thus leaking SO attributes to the public...
  sortField?: string;
  sortOrder?: FindSortOrderHTTPV1;
  hasReference?: ReferenceHTTPV1 | ReferenceHTTPV1[];
  hasReferenceOperator?: FindSearchOperatorHTTPV1;
  // TODO: Fix. This exposes attribute schemas to clients.
  fields?: string | string[];
}

export interface FindResponseHTTPV1 {
  saved_objects: SavedObjectWithMetadataV1[];
  total: number;
}

export interface GetAllowedTypesResponseHTTPV1 {
  types: SavedObjectManagementTypeInfoV1[];
}

export interface RelationshipsParamsHTTPV1 {
  type: string;
  id: string;
}

export interface RelationshipsQueryHTTPV1 {
  size: number;
  savedObjectTypes: string | string[];
}

export interface RelationshipsResponseHTTPV1 {
  relations: SavedObjectRelation[];
  invalidRelations: SavedObjectInvalidRelation[];
}

export interface ScrollCountBodyHTTPV1 {
  typesToInclude: string[];
  // TODO: Fix. this API allows writing an arbitrary query that is passed straight to our persistence layer, thus leaking SO attributes to the public...
  searchString?: string;
  references?: Array<{ type: string; id: string }>;
}

export interface DeleteObjectBodyHTTPV1 {
  id: string;
  type: string;
}

export interface DeleteObjectResponseHTTPV1 {
  id: string;
}

/**
 * In this case "string" is a direct mapping from "typesToInlcude" in {@link ScrollCountBodyHTTPV1['typesToInclude']']}
 */
export type ScrollCountResponseHTTPV1 = Record<string, number>;
