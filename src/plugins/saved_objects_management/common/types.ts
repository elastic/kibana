/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObject } from 'src/core/types';
import { SavedObjectsNamespaceType } from 'src/core/public';

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
}

/**
 * A {@link SavedObject | saved object} enhanced with meta properties used by the client-side plugin.
 */
export type SavedObjectWithMetadata<T = unknown> = SavedObject<T> & {
  meta: SavedObjectMetadata;
};

/**
 * Represents a relation between two {@link SavedObject | saved object}
 */
export interface SavedObjectRelation {
  id: string;
  type: string;
  relationship: 'child' | 'parent';
  meta: SavedObjectMetadata;
}
