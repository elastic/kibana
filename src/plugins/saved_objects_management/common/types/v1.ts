/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '@kbn/core/types';
import type { SavedObjectsNamespaceType } from '@kbn/core/public';
import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';

/** Domain interfaces */

/**
 * The metadata injected into a {@link SavedObject | saved object} when returning
 * {@link SavedObjectWithMetadata | enhanced objects} from the plugin API endpoints.
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
 * A {@link SavedObject | saved object} enhanced with meta properties used by the client-side plugin.
 */
export type SavedObjectWithMetadata<T = unknown> = SavedObject<T> & {
  meta: SavedObjectMetadataV1;
};

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

/**
 * We assume that the "SavedObject" interface is itself versioned and so safe to expose to public code.
 *
 * However, we can better control the output of this API if we used our own, domain-specific type.
 */
export type BulkGetHTTPResponseV1 = Array<SavedObject<unknown>>;

export type FindSearchOperatorHTTPV1 = 'AND' | 'OR';
export type FindSortOrderHTTPV1 = 'asc' | 'desc';

export interface ReferenceHTTPV1 {
  type: string;
  id: string;
}

export interface FindBodyHTTPV1 {
  query: {
    perPage: number;
    page: number;
    type: string | string[];
    // TODO: Fix. this API allows writing an arbitrary query that is passed straight to our persistence layer, thus leaking SO attributes to the public...
    search?: string;
    defaultSearchOperator: FindSearchOperatorHTTPV1;
    // TODO: Fix. this API allows sorting by any field, thus leaking SO attributes to the public...
    sortField: string;
    sortOrder: FindSortOrderHTTPV1;
    hasReference?: ReferenceHTTPV1 | ReferenceHTTPV1[];
    hasReferenceOperator: FindSearchOperatorHTTPV1;
    fields: string | string[];
  };
}

/**
 * TODO: Fix, we are directly expose server-only types to the client. This should
 * be wrapped in something that can be versioned.
 */
export type FindResponseHTTPV1 = SavedObjectsFindResponse;

export interface GetAllowedTypesResponseHTTPV1 {
  types: SavedObjectManagementTypeInfoV1;
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

/**
 * In this case "string" is a direct mapping from "typesToInlcude" in {@link ScrollCountBodyHTTPV1['typesToInclude']']}
 */
export type ScrollCountResponseHTTPV1 = Record<string, number>;
