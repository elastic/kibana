/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryContainer } from '@elastic/elasticsearch/api/types';

import { LegacyUrlAlias, LEGACY_URL_ALIAS_TYPE } from '../../object_types';
import type { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type { SavedObjectsRawDocSource, SavedObjectsSerializer } from '../../serialization';
import type { SavedObject, SavedObjectsBaseOptions } from '../../types';
import { getRootFields } from './included_fields';
import { getSavedObjectFromSource, rawDocExistsInNamespace } from './internal_utils';
import type { RepositoryEsClient } from './repository_es_client';

/**
 * When we collect an object's outbound references, we will only go a maximium of this many levels deep before we throw an error.
 */
const MAX_REFERENCE_GRAPH_DEPTH = 20;

/**
 * When we search for an object's matching aliases, we use a point-in-time which will only stay alive this long.
 */
const PIT_KEEP_ALIVE = '1m';

/**
 * An object to collect references for. It must be a multi-namespace type (in other words, the object type must be registered with the
 * `namespaceType: 'multi'` or `namespaceType: 'multi-isolated'` option).
 *
 * Note: if options.purpose is 'updateObjectsSpaces', it must be a shareable type (in other words, the object type must be registered with
 * the `namespaceType: 'multi'`).
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
  /** Whether or not to include tags when collecting references */
  excludeTags?: boolean;
  /** Any types that should be excluded when collecting references */
  typesToExclude?: string[];
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

export interface CollectMultiNamespaceReferencesParams {
  registry: ISavedObjectTypeRegistry;
  allowedTypes: string[];
  client: RepositoryEsClient;
  serializer: SavedObjectsSerializer;
  getIndexForType: (type: string) => string;
  objects: SavedObjectsCollectMultiNamespaceReferencesObject[];
  options?: SavedObjectsCollectMultiNamespaceReferencesOptions;
}

/**
 * Additional options exposed for unit tests.
 *
 * @internal
 */
export interface CollectMultiNamespaceReferencesParamsInternal
  extends CollectMultiNamespaceReferencesParams {
  /** Default: 1000 */
  searchPerPage?: number;
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
  options = {},
  searchPerPage,
}: CollectMultiNamespaceReferencesParamsInternal): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse> {
  if (!objects.length) {
    return { objects: [] };
  }
  const { namespace, purpose, typesToExclude = [] } = options;
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
  const validObjectTypesFilter = ({ type }: SavedObjectsCollectMultiNamespaceReferencesObject) =>
    allowedTypes.includes(type) &&
    (purpose === 'updateObjectsSpaces'
      ? registry.isShareable(type)
      : registry.isMultiNamespace(type)) &&
    !typesToExclude.includes(type);

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
    const newObjectsToGet = new Set<string>();
    for (let i = 0; i < bulkGetObjects.length; i++) {
      // For every element in bulkGetObjects, there should be a matching element in bulkGetResponse.body.docs
      const { type, id } = bulkGetObjects[i];
      const objectKey = `${type}:${id}`;
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
    count++;
  }

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

  const aliasesMap = await checkLegacyUrlAliases(
    client,
    serializer,
    getIndexForType,
    objectsWithContext,
    searchPerPage
  );
  const results = objectsWithContext.map((obj) => {
    const key = `${obj.type}:${obj.id}`;
    const val = aliasesMap.get(key);
    const spacesWithMatchingAliases = val && Array.from(val);
    return { ...obj, spacesWithMatchingAliases };
  });

  return {
    objects: results,
  };
}

async function checkLegacyUrlAliases(
  client: RepositoryEsClient,
  serializer: SavedObjectsSerializer,
  getIndexForType: (type: string) => string,
  objects: SavedObjectReferenceWithContext[],
  perPage = 1000
) {
  const filteredObjects = objects.filter(({ spaces }) => spaces.length !== 0);
  if (!filteredObjects.length) {
    return new Map<string, Set<string>>();
  }
  let pitId: string | undefined;
  const index = getIndexForType(LEGACY_URL_ALIAS_TYPE);
  const aliasesMap = new Map<string, Set<string>>();
  let error: Error | undefined;
  try {
    const { body } = await client.openPointInTime({ index, keep_alive: PIT_KEEP_ALIVE });
    pitId = body.id;

    const query = createAliasQuery(filteredObjects);
    let lastResultsCount = 0;
    let from = 0;
    do {
      const results = await client.search<SavedObjectsRawDocSource>({
        // don't specify index, since we are using the pit
        body: {
          pit: { id: pitId, keep_alive: PIT_KEEP_ALIVE },
          query,
          from,
        },
        size: perPage,
      });
      const hits = results.body.hits.hits;

      // @ts-expect-error Hit._source may be undefined
      const aliases = hits.map((hit) => serializer.rawToSavedObject<LegacyUrlAlias>(hit));
      for (const alias of aliases) {
        const { sourceId, targetType, targetNamespace } = alias.attributes;
        const key = `${targetType}:${sourceId}`;
        const val = aliasesMap.get(key) ?? new Set<string>();
        val.add(targetNamespace);
        aliasesMap.set(key, val);
      }

      lastResultsCount = hits.length;
      from += lastResultsCount;
    } while (lastResultsCount >= perPage); // end the loop when there are fewer hits than our perPage size
  } catch (e) {
    error = e;
  }

  if (pitId) {
    try {
      await client.closePointInTime({ body: { id: pitId } });
    } catch (e) {
      if (!error) {
        error = e;
      }
    }
  }

  if (error) {
    throw new Error(`Failed to retrieve legacy URL aliases: ${error.message}`);
  }
  return aliasesMap;
}

function createAliasQuery(objects: SavedObjectReferenceWithContext[]): QueryContainer {
  return {
    bool: {
      minimum_should_match: 1,
      must: [{ term: { type: LEGACY_URL_ALIAS_TYPE } }],
      should: objects.map(({ type, id }) => ({
        bool: {
          must: [
            { term: { [`${LEGACY_URL_ALIAS_TYPE}.targetType`]: type } },
            { term: { [`${LEGACY_URL_ALIAS_TYPE}.sourceId`]: id } },
          ],
        },
      })),
    },
  };
}

/** Parses a 'type:id' key string and returns an object with a `type` field and an `id` field */
function parseKey(key: string) {
  const type = key.slice(0, key.indexOf(':'));
  const id = key.slice(type.length + 1);
  return { type, id };
}
