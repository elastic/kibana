/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '@kbn/core/types';

import type {
  SavedObjectGetRelationshipsResponseV1,
  SavedObjectInvalidRelationV1,
  SavedObjectManagementTypeInfoV1,
  SavedObjectRelationV1,
  SavedObjectRelationKindV1,
  SavedObjectMetadataV1,
} from './v1';

/**
 * The metadata injected into a {@link SavedObject | saved object} when returning
 * {@link SavedObjectWithMetadata | enhanced objects} from the plugin API endpoints.
 */
export type SavedObjectMetadata = SavedObjectMetadataV1;

/**
 * A {@link SavedObject | saved object} enhanced with meta properties used by the client-side plugin.
 */
export type SavedObjectWithMetadata<T = unknown> = SavedObject<T> & {
  meta: SavedObjectMetadata;
};

export type SavedObjectRelationKind = SavedObjectRelationKindV1;

/**
 * Represents a relation between two {@link SavedObject | saved object}
 */
export type SavedObjectRelation = SavedObjectRelationV1;
/**
 * Represents a relation between two {@link SavedObject | saved object}
 */
export type SavedObjectInvalidRelation = SavedObjectInvalidRelationV1;
export type SavedObjectGetRelationshipsResponse = SavedObjectGetRelationshipsResponseV1;
export type SavedObjectManagementTypeInfo = SavedObjectManagementTypeInfoV1;
