/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type { SavedObjectsSerializer } from '../../serialization';
import type { SavedObject } from '../../types';
import { getRootFields } from './included_fields';
import { getSavedObjectFromSource } from './internal_utils';
import type { RepositoryEsClient } from './repository_es_client';

/**
 *
 * @public
 */
export interface SavedObjectsCollectMultiNamespaceReferencesObject {
  id: string;
  type: string;
}

/**
 *
 * @public
 */
export interface SavedObjectReferenceWithContext {
  /** The type of the referenced object */
  type: string;
  /** The ID of the referenced object */
  id: string;
  /** The space(s) that the referenced object exists in */
  spaces: string[];
  /** References to this object */
  from: Array<{
    /** The type of the object that has the inbound reference */
    type: string;
    /** The ID of the object that has the inbound reference */
    id: string;
    /** The name of the inbound reference */
    name: string;
  }>;
  /** The version of the referenced object (undefined if this reference is missing); this is used for optimistic concurrency control */
  version?: string;
  /** Whether or not this reference is missing */
  isMissing?: boolean;
}

/**
 *
 * @public
 */
export interface SavedObjectsCollectMultiNamespaceReferencesResponse {
  objects: SavedObjectReferenceWithContext[];
}

export interface CollectMultiNamespaceReferencesParams {
  registry: ISavedObjectTypeRegistry;
  allowedTypes: string[];
  client: RepositoryEsClient;
  serializer: SavedObjectsSerializer;
  getIndexForType: (type: string) => string;
  objects: SavedObjectsCollectMultiNamespaceReferencesObject[];
}

/**
 * Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
 * type.
 */
export async function collectMultiNamespaceReferences({
  registry,
  allowedTypes,
  client,
  serializer,
  getIndexForType,
  objects,
}: CollectMultiNamespaceReferencesParams): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse> {
  const inboundReferencesMap = objects.reduce(
    // Add the input objects to the references map so they are returned with the results, even if they have no inbound references
    (acc, { type, id }) => acc.set(`${type}:${id}`, new Map()),
    new Map<string, Map<string, string>>()
  );
  const objectMap = new Map<string, SavedObject | null>();

  const rootFields = getRootFields();
  const makeBulkGetDocs = (objectsToGet: SavedObjectsCollectMultiNamespaceReferencesObject[]) =>
    objectsToGet.map(({ type, id }) => ({
      _id: serializer.generateRawId(undefined, type, id),
      _index: getIndexForType(type),
      _source: rootFields, // Optimized to only retrieve root fields (ignoring type-specific fields)
    }));
  const objectFilter = ({ type }: SavedObjectsCollectMultiNamespaceReferencesObject) =>
    allowedTypes.includes(type) && registry.isMultiNamespace(type);

  let bulkGetObjects = objects.filter(objectFilter);
  while (bulkGetObjects.length) {
    const bulkGetResponse = await client.mget(
      { body: { docs: makeBulkGetDocs(bulkGetObjects) } },
      { ignore: [404] }
    );
    const newObjectsToGet = new Set<string>();
    for (let i = 0; i < bulkGetObjects.length; i++) {
      const { type, id } = bulkGetObjects[i];
      const objectKey = `${type}:${id}`;
      const doc = bulkGetResponse.body.docs[i];
      if (!doc.found) {
        objectMap.set(objectKey, null);
        continue;
      }
      // @ts-expect-error MultiGetHit._source is optional
      const object = getSavedObjectFromSource(registry, type, id, doc);
      objectMap.set(objectKey, object);
      for (const reference of object.references) {
        if (!objectFilter(reference)) {
          continue;
        }
        const referenceKey = `${reference.type}:${reference.id}`;
        const referenceVal = inboundReferencesMap.get(referenceKey) ?? new Map<string, string>();
        if (!referenceVal.has(objectKey)) {
          inboundReferencesMap.set(referenceKey, referenceVal.set(objectKey, reference.name));
        }
        if (!objectMap.has(referenceKey)) {
          newObjectsToGet.add(referenceKey);
        }
      }
    }
    bulkGetObjects = Array.from(newObjectsToGet).map((key) => parseKey(key));
  }

  const results = Array.from(inboundReferencesMap.entries()).map<SavedObjectReferenceWithContext>(
    ([referenceKey, referenceVal]) => {
      const from = Array.from(referenceVal.entries()).map(([objectKey, name]) => {
        const { type, id } = parseKey(objectKey);
        return { type, id, name };
      });
      const { type, id } = parseKey(referenceKey);
      const object = objectMap.get(referenceKey);
      const spaces = object?.namespaces ?? [];
      const version = object?.version;
      return { type, id, spaces, from, version, ...(object === null && { isMissing: true }) };
    }
  );

  return {
    objects: results,
  };
}

/** Parses a 'type:id' key string and returns an object with a `type` field and an `id` field */
function parseKey(key: string) {
  const type = key.slice(0, key.indexOf(':'));
  const id = key.slice(type.length + 1);
  return { type, id };
}
