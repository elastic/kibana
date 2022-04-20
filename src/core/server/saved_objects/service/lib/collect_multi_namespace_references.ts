/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNotFoundFromUnsupportedServer } from '../../../elasticsearch';
import type { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type { SavedObjectsSerializer } from '../../serialization';
import type { SavedObject, SavedObjectsBaseOptions } from '../../types';
import { SavedObjectsErrorHelpers } from './errors';
import { findLegacyUrlAliases } from './legacy_url_aliases';
import { getRootFields } from './included_fields';
import {
  getObjectKey,
  getSavedObjectFromSource,
  parseObjectKey,
  rawDocExistsInNamespace,
} from './internal_utils';
import type { CreatePointInTimeFinderFn } from './point_in_time_finder';
import type { RepositoryEsClient } from './repository_es_client';
import { findSharedOriginObjects } from './find_shared_origin_objects';

/**
 * When we collect an object's outbound references, we will only go a maximum of this many levels deep before we throw an error.
 */
const MAX_REFERENCE_GRAPH_DEPTH = 20;

/**
 * How many aliases or objects with shared origins to search for per page. This is smaller than the PointInTimeFinder's default of 1000. We
 * specify 100 for the page count because this is a relatively unimportant operation, and we want to avoid blocking the Elasticsearch thread
 * pool for longer than necessary.
 *
 * @internal
 */
export const ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE = 100;

/**
 * An object to collect references for. It must be a multi-namespace type (in other words, the object type must be registered with the
 * `namespaceType: 'multiple'` or `namespaceType: 'multiple-isolated'` option).
 *
 * Note: if options.purpose is 'updateObjectsSpaces', it must be a shareable type (in other words, the object type must be registered with
 * the `namespaceType: 'multiple'`).
 *
 * @public
 */
export interface SavedObjectsCollectMultiNamespaceReferencesObject {
  id: string;
  type: string;
}

/**
 * Options for collecting references.
 *
 * @public
 */
export interface SavedObjectsCollectMultiNamespaceReferencesOptions
  extends SavedObjectsBaseOptions {
  /** Optional purpose used to determine filtering and authorization checks; default is 'collectMultiNamespaceReferences' */
  purpose?: 'collectMultiNamespaceReferences' | 'updateObjectsSpaces';
}

/**
 * A returned input object or one of its references, with additional context.
 *
 * @public
 */
export interface SavedObjectReferenceWithContext {
  /** The type of the referenced object */
  type: string;
  /** The ID of the referenced object */
  id: string;
  /** The origin ID of the referenced object (if it has one) */
  originId?: string;
  /** The space(s) that the referenced object exists in */
  spaces: string[];
  /**
   * References to this object; note that this does not contain _all inbound references everywhere for this object_, it only contains
   * inbound references for the scope of this operation
   */
  inboundReferences: Array<{
    /** The type of the object that has the inbound reference */
    type: string;
    /** The ID of the object that has the inbound reference */
    id: string;
    /** The name of the inbound reference */
    name: string;
  }>;
  /** Whether or not this object or reference is missing */
  isMissing?: boolean;
  /** The space(s) that legacy URL aliases matching this type/id exist in */
  spacesWithMatchingAliases?: string[];
  /** The space(s) that objects matching this origin exist in (including this one) */
  spacesWithMatchingOrigins?: string[];
}

/**
 * The response when object references are collected.
 *
 * @public
 */
export interface SavedObjectsCollectMultiNamespaceReferencesResponse {
  objects: SavedObjectReferenceWithContext[];
}

/**
 * Parameters for the collectMultiNamespaceReferences function.
 *
 * @internal
 */
export interface CollectMultiNamespaceReferencesParams {
  registry: ISavedObjectTypeRegistry;
  allowedTypes: string[];
  client: RepositoryEsClient;
  serializer: SavedObjectsSerializer;
  getIndexForType: (type: string) => string;
  createPointInTimeFinder: CreatePointInTimeFinderFn;
  objects: SavedObjectsCollectMultiNamespaceReferencesObject[];
  options?: SavedObjectsCollectMultiNamespaceReferencesOptions;
}

/**
 * Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
 * type.
 *
 * @internal
 */
export async function collectMultiNamespaceReferences(
  params: CollectMultiNamespaceReferencesParams
): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse> {
  const { createPointInTimeFinder, objects } = params;
  if (!objects.length) {
    return { objects: [] };
  }

  const { objectMap, inboundReferencesMap } = await getObjectsAndReferences(params);
  const objectsWithContext = Array.from(
    inboundReferencesMap.entries()
  ).map<SavedObjectReferenceWithContext>(([referenceKey, referenceVal]) => {
    const inboundReferences = Array.from(referenceVal.entries()).map(([objectKey, name]) => {
      const { type, id } = parseObjectKey(objectKey);
      return { type, id, name };
    });
    const { type, id } = parseObjectKey(referenceKey);
    const object = objectMap.get(referenceKey);
    const originId = object?.originId;
    const spaces = object?.namespaces ?? [];
    return {
      type,
      id,
      originId,
      spaces,
      inboundReferences,
      ...(object === null && { isMissing: true }),
    };
  });

  const objectsToFindAliasesFor = objectsWithContext
    .filter(({ spaces }) => spaces.length !== 0)
    .map(({ type, id }) => ({ type, id }));
  const aliasesMap = await findLegacyUrlAliases(
    createPointInTimeFinder,
    objectsToFindAliasesFor,
    ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE
  );
  const objectOriginsToSearchFor = objectsWithContext
    .filter(({ spaces }) => spaces.length !== 0)
    .map(({ type, id, originId }) => ({ type, origin: originId || id }));
  const originsMap = await findSharedOriginObjects(
    createPointInTimeFinder,
    objectOriginsToSearchFor,
    ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE
  );
  const results = objectsWithContext.map((obj) => {
    const aliasesVal = aliasesMap.get(getObjectKey(obj));
    const spacesWithMatchingAliases = aliasesVal && Array.from(aliasesVal).sort();
    const originsVal = originsMap.get(getObjectKey({ type: obj.type, id: obj.originId || obj.id }));
    const spacesWithMatchingOrigins = originsVal && Array.from(originsVal).sort();
    return { ...obj, spacesWithMatchingAliases, spacesWithMatchingOrigins };
  });

  return {
    objects: results,
  };
}

/**
 * Recursively fetches objects and their references, returning a map of the retrieved objects and a map of all inbound references.
 */
async function getObjectsAndReferences({
  registry,
  allowedTypes,
  client,
  serializer,
  getIndexForType,
  objects,
  options = {},
}: CollectMultiNamespaceReferencesParams) {
  const { namespace, purpose } = options;
  const inboundReferencesMap = objects.reduce(
    // Add the input objects to the references map so they are returned with the results, even if they have no inbound references
    (acc, cur) => acc.set(getObjectKey(cur), new Map()),
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
  const validObjectTypesFilter = ({ type }: SavedObjectsCollectMultiNamespaceReferencesObject) =>
    allowedTypes.includes(type) &&
    (purpose === 'updateObjectsSpaces'
      ? registry.isShareable(type)
      : registry.isMultiNamespace(type));

  let bulkGetObjects = objects.filter(validObjectTypesFilter);
  let count = 0; // this is a circuit-breaker to ensure we don't hog too many resources; we should never have an object graph this deep
  while (bulkGetObjects.length) {
    if (count >= MAX_REFERENCE_GRAPH_DEPTH) {
      throw new Error(
        `Exceeded maximum reference graph depth of ${MAX_REFERENCE_GRAPH_DEPTH} objects!`
      );
    }
    const bulkGetResponse = await client.mget(
      { body: { docs: makeBulkGetDocs(bulkGetObjects) } },
      { ignore: [404], meta: true }
    );
    // exit early if we can't verify a 404 response is from Elasticsearch
    if (
      isNotFoundFromUnsupportedServer({
        statusCode: bulkGetResponse.statusCode,
        headers: bulkGetResponse.headers,
      })
    ) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
    }
    const newObjectsToGet = new Set<string>();
    for (let i = 0; i < bulkGetObjects.length; i++) {
      // For every element in bulkGetObjects, there should be a matching element in bulkGetResponse.body.docs
      const { type, id } = bulkGetObjects[i];
      const objectKey = getObjectKey({ type, id });
      const doc = bulkGetResponse.body.docs[i];
      // @ts-expect-error MultiGetHit._source is optional
      if (!doc.found || !rawDocExistsInNamespace(registry, doc, namespace)) {
        objectMap.set(objectKey, null);
        continue;
      }
      // @ts-expect-error MultiGetHit._source is optional
      const object = getSavedObjectFromSource(registry, type, id, doc);
      objectMap.set(objectKey, object);
      for (const reference of object.references) {
        if (!validObjectTypesFilter(reference)) {
          continue;
        }
        const referenceKey = getObjectKey(reference);
        const referenceVal = inboundReferencesMap.get(referenceKey) ?? new Map<string, string>();
        if (!referenceVal.has(objectKey)) {
          inboundReferencesMap.set(referenceKey, referenceVal.set(objectKey, reference.name));
        }
        if (!objectMap.has(referenceKey)) {
          newObjectsToGet.add(referenceKey);
        }
      }
    }
    bulkGetObjects = Array.from(newObjectsToGet).map((key) => parseObjectKey(key));
    count++;
  }

  return { objectMap, inboundReferencesMap };
}
