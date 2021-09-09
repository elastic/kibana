/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as esKuery from '@kbn/es-query';
import { isNotFoundFromUnsupportedServer } from '../../../elasticsearch';
import { LegacyUrlAlias, LEGACY_URL_ALIAS_TYPE } from '../../object_types';
import type { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type { SavedObjectsSerializer } from '../../serialization';
import type { SavedObject, SavedObjectsBaseOptions } from '../../types';
import { SavedObjectsErrorHelpers } from './errors';
import { getRootFields } from './included_fields';
import { getSavedObjectFromSource, rawDocExistsInNamespace } from './internal_utils';
import type {
  ISavedObjectsPointInTimeFinder,
  SavedObjectsCreatePointInTimeFinderOptions,
} from './point_in_time_finder';
import type { RepositoryEsClient } from './repository_es_client';

/**
 * When we collect an object's outbound references, we will only go a maximum of this many levels deep before we throw an error.
 */
const MAX_REFERENCE_GRAPH_DEPTH = 20;

/**
 * How many aliases to search for per page. This is smaller than the PointInTimeFinder's default of 1000. We specify 100 for the page count
 * because this is a relatively unimportant operation, and we want to avoid blocking the Elasticsearch thread pool for longer than
 * necessary.
 */
const ALIAS_SEARCH_PER_PAGE = 100;

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
  createPointInTimeFinder: <T = unknown, A = unknown>(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions
  ) => ISavedObjectsPointInTimeFinder<T, A>;
  objects: SavedObjectsCollectMultiNamespaceReferencesObject[];
  options?: SavedObjectsCollectMultiNamespaceReferencesOptions;
}

/**
 * Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
 * type.
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
      const { type, id } = parseKey(objectKey);
      return { type, id, name };
    });
    const { type, id } = parseKey(referenceKey);
    const object = objectMap.get(referenceKey);
    const spaces = object?.namespaces ?? [];
    return { type, id, spaces, inboundReferences, ...(object === null && { isMissing: true }) };
  });

  const aliasesMap = await checkLegacyUrlAliases(createPointInTimeFinder, objectsWithContext);
  const results = objectsWithContext.map((obj) => {
    const key = getKey(obj);
    const val = aliasesMap.get(key);
    const spacesWithMatchingAliases = val && Array.from(val);
    return { ...obj, spacesWithMatchingAliases };
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
    (acc, cur) => acc.set(getKey(cur), new Map()),
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
      { ignore: [404] }
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
      const objectKey = getKey({ type, id });
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
        const referenceKey = getKey(reference);
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
    count++;
  }

  return { objectMap, inboundReferencesMap };
}

/**
 * Fetches all legacy URL aliases that match the given objects, returning a map of the matching aliases and what space(s) they exist in.
 */
async function checkLegacyUrlAliases(
  createPointInTimeFinder: <T = unknown, A = unknown>(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions
  ) => ISavedObjectsPointInTimeFinder<T, A>,
  objects: SavedObjectReferenceWithContext[]
) {
  const filteredObjects = objects.filter(({ spaces }) => spaces.length !== 0);
  if (!filteredObjects.length) {
    return new Map<string, Set<string>>();
  }
  const filter = createAliasKueryFilter(filteredObjects);
  const finder = createPointInTimeFinder<LegacyUrlAlias>({
    type: LEGACY_URL_ALIAS_TYPE,
    perPage: ALIAS_SEARCH_PER_PAGE,
    filter,
  });
  const aliasesMap = new Map<string, Set<string>>();
  let error: Error | undefined;
  try {
    for await (const { saved_objects: savedObjects } of finder.find()) {
      for (const alias of savedObjects) {
        const { sourceId, targetType, targetNamespace } = alias.attributes;
        const key = getKey({ type: targetType, id: sourceId });
        const val = aliasesMap.get(key) ?? new Set<string>();
        val.add(targetNamespace);
        aliasesMap.set(key, val);
      }
    }
  } catch (e) {
    error = e;
  }

  try {
    await finder.close();
  } catch (e) {
    if (!error) {
      error = e;
    }
  }

  if (error) {
    throw new Error(`Failed to retrieve legacy URL aliases: ${error.message}`);
  }
  return aliasesMap;
}

function createAliasKueryFilter(objects: SavedObjectReferenceWithContext[]) {
  const { buildNode } = esKuery.nodeTypes.function;
  const kueryNodes = objects.reduce<unknown[]>((acc, { type, id }) => {
    const match1 = buildNode('is', `${LEGACY_URL_ALIAS_TYPE}.attributes.targetType`, type);
    const match2 = buildNode('is', `${LEGACY_URL_ALIAS_TYPE}.attributes.sourceId`, id);
    acc.push(buildNode('and', [match1, match2]));
    return acc;
  }, []);
  return buildNode('and', [
    buildNode('not', buildNode('is', `${LEGACY_URL_ALIAS_TYPE}.attributes.disabled`, true)), // ignore aliases that have been disabled
    buildNode('or', kueryNodes),
  ]);
}

/** Takes an object with a `type` and `id` field and returns a key string */
function getKey({ type, id }: { type: string; id: string }) {
  return `${type}:${id}`;
}

/** Parses a 'type:id' key string and returns an object with a `type` field and an `id` field */
function parseKey(key: string) {
  const type = key.slice(0, key.indexOf(':'));
  const id = key.slice(type.length + 1);
  return { type, id };
}
