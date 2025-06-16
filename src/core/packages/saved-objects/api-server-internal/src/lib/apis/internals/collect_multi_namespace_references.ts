/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type {
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectReferenceWithContext,
} from '@kbn/core-saved-objects-api-server';
import {
  type ISavedObjectsSecurityExtension,
  type ISavedObjectTypeRegistry,
  type SavedObject,
  type ISavedObjectsSerializer,
  SavedObjectsErrorHelpers,
  WithAuditName,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { getObjectKey, parseObjectKey } from '@kbn/core-saved-objects-base-server-internal';
import { findLegacyUrlAliases } from './find_legacy_url_aliases';
import { getRootFields } from '../../utils';
import type { CreatePointInTimeFinderFn } from '../../point_in_time_finder';
import type { RepositoryEsClient } from '../../repository_es_client';
import {
  findSharedOriginObjects,
  getSavedObjectFromSource,
  rawDocExistsInNamespace,
} from '../utils';

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
 * Parameters for the collectMultiNamespaceReferences function.
 *
 * @internal
 */
export interface CollectMultiNamespaceReferencesParams {
  registry: ISavedObjectTypeRegistry;
  allowedTypes: string[];
  client: RepositoryEsClient;
  serializer: ISavedObjectsSerializer;
  getIndexForType: (type: string) => string;
  createPointInTimeFinder: CreatePointInTimeFinderFn;
  securityExtension: ISavedObjectsSecurityExtension | undefined;
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
  const { createPointInTimeFinder, objects, securityExtension, options, registry } = params;
  if (!objects.length) {
    return { objects: [] };
  }

  const { objectMap, inboundReferencesMap } = await getObjectsAndReferences(params);
  const objectsWithContext = Array.from(inboundReferencesMap.entries()).map<
    WithAuditName<SavedObjectReferenceWithContext>
  >(([referenceKey, referenceVal]) => {
    const inboundReferences = Array.from(referenceVal.entries()).map(([objectKey, name]) => {
      const { type, id } = parseObjectKey(objectKey);
      return { type, id, name };
    });
    const { type, id } = parseObjectKey(referenceKey);
    const object = objectMap.get(referenceKey);
    const originId = object?.originId;
    const spaces = object?.namespaces ?? [];

    const name = SavedObjectsUtils.getName(registry.getNameAttribute(object?.type!), object);

    return {
      type,
      id,
      originId,
      spaces,
      inboundReferences,
      name,
      ...(object === null && { isMissing: true }),
    };
  });

  const foundObjects = objectsWithContext.filter(({ spaces }) => spaces.length !== 0); // Any objects that have a non-empty `spaces` field are "found"
  const objectsToFindAliasesFor = foundObjects.map(({ type, id }) => ({ type, id }));
  const aliasesMap = await findLegacyUrlAliases(
    createPointInTimeFinder,
    objectsToFindAliasesFor,
    ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE
  );
  const objectOriginsToSearchFor = foundObjects.map(({ type, id, originId }) => ({
    type,
    id,
    origin: originId,
  }));
  const originsMap = await findSharedOriginObjects(
    createPointInTimeFinder,
    objectOriginsToSearchFor,
    ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE,
    options?.purpose
  );
  const results = objectsWithContext.map((obj) => {
    const aliasesVal = aliasesMap.get(getObjectKey(obj));
    const spacesWithMatchingAliases = aliasesVal && Array.from(aliasesVal).sort();
    const originsVal = originsMap.get(getObjectKey({ type: obj.type, id: obj.originId || obj.id }));
    const spacesWithMatchingOrigins = originsVal && Array.from(originsVal).sort();
    const { name, ...normalizedObject } = obj;

    return {
      ...normalizedObject,
      spacesWithMatchingAliases,
      spacesWithMatchingOrigins,
      ...(securityExtension && { name }),
    };
  });

  if (!securityExtension) {
    return { objects: results };
  }

  // Now that we have *all* information for the object graph, if the Security extension is enabled, we can: check/enforce authorization,
  // write audit events, filter the object graph, and redact spaces from the objects.
  const filteredAndRedactedResults =
    await securityExtension.authorizeAndRedactMultiNamespaceReferences({
      namespace: SavedObjectsUtils.namespaceIdToString(options?.namespace),
      objects: results,
      options: { purpose: options?.purpose },
    });
  return {
    objects: filteredAndRedactedResults,
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
      { docs: makeBulkGetDocs(bulkGetObjects) },
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
