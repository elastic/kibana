/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '@kbn/core/types';
import type { SavedObjectsNamespaceType } from '@kbn/core/public';

/**
 * The metadata injected into a {@link SavedObject | saved object} when returning
 * {@link SavedObjectWithMetadata | enhanced objects} from the plugin API endpoints.
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
 * A {@link SavedObject | saved object} enhanced with meta properties used by the client-side plugin.
 */
export type SavedObjectWithMetadata<T = unknown> = SavedObject<T> & {
  meta: SavedObjectMetadata;
};

export type SavedObjectRelationKind = 'child' | 'parent';

/**
 * Represents a relation between two {@link SavedObject | saved object}
 */
export interface SavedObjectRelation {
  id: string;
  type: string;
  relationship: SavedObjectRelationKind;
  meta: SavedObjectMetadata;
}

export interface SavedObjectInvalidRelation {
  id: string;
  type: string;
  relationship: SavedObjectRelationKind;
  error: string;
}

export interface SavedObjectGetRelationshipsResponse {
  relations: SavedObjectRelation[];
  invalidRelations: SavedObjectInvalidRelation[];
}

export interface SavedObjectManagementTypeInfo {
  name: string;
  namespaceType: SavedObjectsNamespaceType;
  hidden: boolean;
  displayName: string;
}
