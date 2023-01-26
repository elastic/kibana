/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type {
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectReferenceWithContext,
} from '@kbn/core-saved-objects-api-server';
import {
  AuditAction,
  type ISavedObjectsSecurityExtension,
  type ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers, SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  type SavedObjectsSerializer,
  getObjectKey,
  parseObjectKey,
} from '@kbn/core-saved-objects-base-server-internal';
import { findLegacyUrlAliases } from './legacy_url_aliases';
import { getRootFields } from './included_fields';
import { getSavedObjectFromSource, rawDocExistsInNamespace } from './internal_utils';
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

  const foundObjects = objectsWithContext.filter(({ spaces }) => spaces.length !== 0); // Any objects that have a non-empty `spaces` field are "found"
  const objectsToFindAliasesFor = foundObjects.map(({ type, id }) => ({ type, id }));
  const aliasesMap = await findLegacyUrlAliases(
    createPointInTimeFinder,
    objectsToFindAliasesFor,
    ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE
  );
  const objectOriginsToSearchFor = foundObjects.map(({ type, id, originId }) => ({
    type,
    origin: originId || id,
  }));
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

  // Now that we have *all* information for the object graph, if the Security extension is enabled, we can: check/enforce authorization,
  // write audit events, filter the object graph, and redact spaces from the objects.
  const filteredAndRedactedResults = await optionallyUseSecurity(results, params);

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

/**
 * Checks/enforces authorization, writes audit events, filters the object graph, and redacts spaces from the share_to_space/bulk_get
 * response. In other SavedObjectsRepository functions we do this before decrypting attributes. However, because of the
 * share_to_space/bulk_get response logic involved in deciding between the exact match or alias match, it's cleaner to do authorization,
 * auditing, filtering, and redaction all afterwards.
 */
async function optionallyUseSecurity(
  objectsWithContext: SavedObjectReferenceWithContext[],
  params: CollectMultiNamespaceReferencesParams
) {
  const { securityExtension, objects, options = {} } = params;
  const { purpose, namespace } = options;
  const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
  if (!securityExtension) {
    return objectsWithContext;
  }

  // Check authorization based on all *found* object types / spaces
  const typesToAuthorize = new Set<string>();
  const spacesToAuthorize = new Set<string>([namespaceString]);
  const addSpacesToAuthorize = (spaces: string[] = []) => {
    for (const space of spaces) spacesToAuthorize.add(space);
  };
  for (const obj of objectsWithContext) {
    typesToAuthorize.add(obj.type);
    addSpacesToAuthorize(obj.spaces);
    addSpacesToAuthorize(obj.spacesWithMatchingAliases);
    addSpacesToAuthorize(obj.spacesWithMatchingOrigins);
  }
  const action =
    purpose === 'updateObjectsSpaces' ? ('share_to_space' as const) : ('bulk_get' as const);

  // Enforce authorization based on all *requested* object types and the current space
  const typesAndSpaces = objects.reduce(
    (acc, { type }) => (acc.has(type) ? acc : acc.set(type, new Set([namespaceString]))), // Always enforce authZ for the active space
    new Map<string, Set<string>>()
  );

  const { typeMap } = await securityExtension?.performAuthorization({
    actions: new Set([action]),
    types: typesToAuthorize,
    spaces: spacesToAuthorize,
    enforceMap: typesAndSpaces,
    auditCallback: (error) => {
      if (!error) return; // We will audit success results below, after redaction
      for (const { type, id } of objects) {
        securityExtension!.addAuditEvent({
          action: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
          savedObject: { type, id },
          error,
        });
      }
    },
  });

  // Now, filter/redact the results. Most SOR functions just redact the `namespaces` field from each returned object. However, this function
  // will actually filter the returned object graph itself.
  // This is done in two steps: (1) objects which the user can't access *in this space* are filtered from the graph, and the
  // graph is rearranged to avoid leaking information. (2) any spaces that the user can't access are redacted from each individual object.
  // After we finish filtering, we can write audit events for each object that is going to be returned to the user.
  const requestedObjectsSet = objects.reduce(
    (acc, { type, id }) => acc.add(`${type}:${id}`),
    new Set<string>()
  );
  const retrievedObjectsSet = objectsWithContext.reduce(
    (acc, { type, id }) => acc.add(`${type}:${id}`),
    new Set<string>()
  );
  const traversedObjects = new Set<string>();
  const filteredObjectsMap = new Map<string, SavedObjectReferenceWithContext>();
  const getIsAuthorizedForInboundReference = (inbound: { type: string; id: string }) => {
    const found = filteredObjectsMap.get(`${inbound.type}:${inbound.id}`);
    return found && !found.isMissing; // If true, this object can be linked back to one of the requested objects
  };
  let objectsToProcess = [...objectsWithContext];
  while (objectsToProcess.length > 0) {
    const obj = objectsToProcess.shift()!;
    const { type, id, spaces, inboundReferences } = obj;
    const objKey = `${type}:${id}`;
    traversedObjects.add(objKey);
    // Is the user authorized to access this object in this space?
    let isAuthorizedForObject = true;
    try {
      // ToDo: this is the only remaining call to enforceAuthorization outside of the security extension
      // This was a bit complicated to change now, but can ultimately be removed when authz logic is
      // migrated from the repo level to the extension level.
      securityExtension.enforceAuthorization({
        typesAndSpaces: new Map([[type, new Set([namespaceString])]]),
        action,
        typeMap,
      });
    } catch (err) {
      isAuthorizedForObject = false;
    }
    // Redact the inbound references so we don't leak any info about other objects that the user is not authorized to access
    const redactedInboundReferences = inboundReferences.filter((inbound) => {
      if (inbound.type === type && inbound.id === id) {
        // circular reference, don't redact it
        return true;
      }
      return getIsAuthorizedForInboundReference(inbound);
    });
    // If the user is not authorized to access at least one inbound reference of this object, then we should omit this object.
    const isAuthorizedForGraph =
      requestedObjectsSet.has(objKey) || // If true, this is one of the requested objects, and we checked authorization above
      redactedInboundReferences.some(getIsAuthorizedForInboundReference);

    if (isAuthorizedForObject && isAuthorizedForGraph) {
      if (spaces.length) {
        // Only generate success audit records for "non-empty results" with 1+ spaces
        // ("empty result" means the object was a non-multi-namespace type, or hidden type, or not found)
        securityExtension.addAuditEvent({
          action: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
          savedObject: { type, id },
        });
      }
      filteredObjectsMap.set(objKey, obj);
    } else if (!isAuthorizedForObject && isAuthorizedForGraph) {
      filteredObjectsMap.set(objKey, { ...obj, spaces: [], isMissing: true });
    } else if (isAuthorizedForObject && !isAuthorizedForGraph) {
      const hasUntraversedInboundReferences = inboundReferences.some(
        (ref) =>
          !traversedObjects.has(`${ref.type}:${ref.id}`) &&
          retrievedObjectsSet.has(`${ref.type}:${ref.id}`)
      );

      if (hasUntraversedInboundReferences) {
        // this object has inbound reference(s) that we haven't traversed yet; bump it to the back of the list
        objectsToProcess = [...objectsToProcess, obj];
      } else {
        // There should never be a missing inbound reference.
        // If there is, then something has gone terribly wrong.
        const missingInboundReference = inboundReferences.find(
          (ref) =>
            !traversedObjects.has(`${ref.type}:${ref.id}`) &&
            !retrievedObjectsSet.has(`${ref.type}:${ref.id}`)
        );

        if (missingInboundReference) {
          throw new Error(
            `Unexpected inbound reference to "${missingInboundReference.type}:${missingInboundReference.id}"`
          );
        }
      }
    }
  }

  const filteredAndRedactedObjects = [
    ...filteredObjectsMap.values(),
  ].map<SavedObjectReferenceWithContext>((obj) => {
    const {
      type,
      id,
      spaces,
      spacesWithMatchingAliases,
      spacesWithMatchingOrigins,
      inboundReferences,
    } = obj;
    // Redact the inbound references so we don't leak any info about other objects that the user is not authorized to access
    const redactedInboundReferences = inboundReferences.filter((inbound) => {
      if (inbound.type === type && inbound.id === id) {
        // circular reference, don't redact it
        return true;
      }
      return getIsAuthorizedForInboundReference(inbound);
    });

    /** Simple wrapper for the `redactNamespaces` function that expects a saved object in its params. */
    const getRedactedSpaces = (spacesArray: string[] | undefined) => {
      if (!spacesArray) return;
      const savedObject = { type, namespaces: spacesArray } as SavedObject; // Other SavedObject attributes aren't required
      const result = securityExtension.redactNamespaces({ savedObject, typeMap });
      return result.namespaces;
    };
    const redactedSpaces = getRedactedSpaces(spaces)!;
    const redactedSpacesWithMatchingAliases = getRedactedSpaces(spacesWithMatchingAliases);
    const redactedSpacesWithMatchingOrigins = getRedactedSpaces(spacesWithMatchingOrigins);
    return {
      ...obj,
      spaces: redactedSpaces,
      ...(redactedSpacesWithMatchingAliases && {
        spacesWithMatchingAliases: redactedSpacesWithMatchingAliases,
      }),
      ...(redactedSpacesWithMatchingOrigins && {
        spacesWithMatchingOrigins: redactedSpacesWithMatchingOrigins,
      }),
      inboundReferences: redactedInboundReferences,
    };
  });

  return filteredAndRedactedObjects;
}
