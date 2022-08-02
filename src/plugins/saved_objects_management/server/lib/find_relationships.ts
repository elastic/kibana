/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { injectMetaAttributes } from './inject_meta_attributes';
import { ISavedObjectsManagement } from '../services';
import {
  SavedObjectInvalidRelation,
  SavedObjectWithMetadata,
  SavedObjectGetRelationshipsResponse,
} from '../types';

export async function findRelationships({
  type,
  id,
  size,
  client,
  referenceTypes,
  savedObjectsManagement,
}: {
  type: string;
  id: string;
  size: number;
  client: SavedObjectsClientContract;
  referenceTypes: string[];
  savedObjectsManagement: ISavedObjectsManagement;
}): Promise<SavedObjectGetRelationshipsResponse> {
  const { references = [] } = await client.get(type, id);

  // Use a map to avoid duplicates, it does happen but have a different "name" in the reference
  const childrenReferences = [
    ...new Map(
      references.map((ref) => [`${ref.type}:${ref.id}`, { id: ref.id, type: ref.type }])
    ).values(),
  ];

  const [childReferencesResponse, parentReferencesResponse] = await Promise.all([
    childrenReferences.length > 0
      ? client.bulkGet(childrenReferences)
      : Promise.resolve({ saved_objects: [] }),
    client.find({
      hasReference: { type, id },
      perPage: size,
      type: referenceTypes,
    }),
  ]);

  const invalidRelations: SavedObjectInvalidRelation[] = childReferencesResponse.saved_objects
    .filter((obj) => Boolean(obj.error))
    .map((obj) => ({
      id: obj.id,
      type: obj.type,
      relationship: 'child',
      error: obj.error!.message,
    }));

  const relations = [
    ...childReferencesResponse.saved_objects
      .filter((obj) => !obj.error)
      .map((obj) => injectMetaAttributes(obj, savedObjectsManagement))
      .map(extractCommonProperties)
      .map((obj) => ({
        ...obj,
        relationship: 'child' as const,
      })),
    ...parentReferencesResponse.saved_objects
      .map((obj) => injectMetaAttributes(obj, savedObjectsManagement))
      .map(extractCommonProperties)
      .map((obj) => ({
        ...obj,
        relationship: 'parent' as const,
      })),
  ];

  return {
    relations,
    invalidRelations,
  };
}

function extractCommonProperties(savedObject: SavedObjectWithMetadata) {
  return {
    id: savedObject.id,
    type: savedObject.type,
    meta: savedObject.meta,
  };
}
