/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNotFoundFromUnsupportedServer } from '../../../elasticsearch';
import { LegacyUrlAlias, LEGACY_URL_ALIAS_TYPE } from '../../object_types';
import type { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type {
  SavedObjectsRawDoc,
  SavedObjectsRawDocSource,
  SavedObjectsSerializer,
} from '../../serialization';
import { SavedObjectsErrorHelpers } from './errors';
import { findLegacyUrlAliases } from './find_legacy_url_aliases';
import { Either, rawDocExistsInNamespaces } from './internal_utils';
import { getObjectKey, isLeft, isRight } from './internal_utils';
import type { CreatePointInTimeFinderFn } from './point_in_time_finder';
import type { RepositoryEsClient } from './repository_es_client';
import { ALL_NAMESPACES_STRING } from './utils';

export interface PreflightCheckForCreateObject {
  /** The type of the object. */
  type: string;
  /** The ID of the object. */
  id: string;
  /** Whether or not the object should be overwritten if it would encounter a regular conflict. */
  overwrite: boolean;
  /** The namespaces that the consumer intends to create this object in. */
  namespaces: string[];
}

export interface PreflightCheckForCreateParams {
  registry: ISavedObjectTypeRegistry;
  client: RepositoryEsClient;
  serializer: SavedObjectsSerializer;
  getIndexForType: (type: string) => string;
  createPointInTimeFinder: CreatePointInTimeFinderFn;
  objects: PreflightCheckForCreateObject[];
}

export interface PreflightCheckForCreateResult {
  /** The type of the object. */
  type: string;
  /** The ID of the object. */
  id: string;
  /** Only included if we did not encounter an error _and_ the object was found. */
  existingDocument?: SavedObjectsRawDoc;
  /** Only included if we encountered an error. */
  error?: {
    type: 'aliasConflict' | 'unresolvableConflict' | 'conflict';
    metadata?: {
      spacesWithConflictingAliases?: string[];
      isNotOverwritable?: boolean;
    };
  };
}

interface ParsedObject {
  type: string;
  id: string;
  overwrite: boolean;
  spaces: Set<string>;
}

/**
 * If the object will be created in this many spaces (or "*" all current and future spaces), we use find to fetch all aliases.
 * If the object does not exceed this threshold, we use mget to fetch aliases instead.
 * This threshold is a bit arbitary, but it is intended to optimize so we don't make expensive PIT/find operations unless it is necessary.
 */
const FIND_ALIASES_THRESHOLD = 3;

/**
 * Conducts pre-flight checks before object creation. Consumers should only check eligible objects (multi-namespace types).
 *
 * @param objects The objects that the consumer intends to create.
 *
 * @internal
 */
export async function preflightCheckForCreate(params: PreflightCheckForCreateParams) {
  const { registry, client, serializer, getIndexForType, createPointInTimeFinder, objects } =
    params;

  // Make a discriminated union based on the spaces the objects should be created in (Left=mget aliases, Right=find aliases)
  const objectsToGetOrObjectsToFind = objects.map<Either<ParsedObject>>((object) => {
    const { type, id, overwrite, namespaces } = object;
    const spaces = new Set(namespaces);
    const tag =
      spaces.size > FIND_ALIASES_THRESHOLD || spaces.has(ALL_NAMESPACES_STRING) ? 'Right' : 'Left';
    return { tag, value: { type, id, overwrite, spaces } };
  });

  const objectsToFind = objectsToGetOrObjectsToFind
    .filter(isRight)
    .map(({ value: { type, id } }) => ({ type, id }));
  const aliasMap = await findLegacyUrlAliases(createPointInTimeFinder, objectsToFind);

  // Make another discriminated union based on the find results (Left=error, Right=mget objects/aliases)
  const aliasConflictsOrObjectsToGet = objectsToGetOrObjectsToFind.map<
    Either<
      ParsedObject & { spacesWithConflictingAliases: string[] },
      ParsedObject & { checkAliases: boolean }
    >
  >((either) => {
    let checkAliases = true;
    if (isRight(either)) {
      const { type, id, spaces } = either.value;
      const key = getObjectKey({ type, id });
      const spacesWithMatchingAliases = aliasMap.get(key);
      if (spacesWithMatchingAliases) {
        let spacesWithConflictingAliases: string[] = [];
        if (spaces.has(ALL_NAMESPACES_STRING)) {
          spacesWithConflictingAliases = [...spacesWithMatchingAliases];
        } else {
          spacesWithConflictingAliases = intersection(spaces, spacesWithMatchingAliases);
        }
        if (spacesWithConflictingAliases.length) {
          // we found one or more conflicting aliases, this is an error result
          return { tag: 'Left', value: { ...either.value, spacesWithConflictingAliases } };
        }
      }
      // we checked for aliases but did not detect any conflicts; make sure we don't check for aliases again during mget
      checkAliases = false;
    }
    return { tag: 'Right', value: { ...either.value, checkAliases } };
  });

  const objectsToGet = aliasConflictsOrObjectsToGet.filter(isRight);
  const docsToBulkGet: Array<{ _id: string; _index: string; _source: string[] }> = [];
  const aliasSpaces: string[] = [];
  for (const { value } of objectsToGet) {
    const { type, id, spaces } = value;
    docsToBulkGet.push({
      _id: serializer.generateRawId(undefined, type, id),
      _index: getIndexForType(type),
      _source: ['type', 'namespaces'],
    });
    if (value.checkAliases) {
      for (const space of spaces) {
        const rawAliasId = serializer.generateRawLegacyUrlAliasId(space, type, id);
        docsToBulkGet.push({
          _id: rawAliasId,
          _index: getIndexForType(LEGACY_URL_ALIAS_TYPE),
          _source: [`${LEGACY_URL_ALIAS_TYPE}.disabled`],
        });
        aliasSpaces.push(space);
      }
    }
  }

  const bulkGetResponse = docsToBulkGet.length
    ? await client.mget<SavedObjectsRawDocSource>(
        { body: { docs: docsToBulkGet } },
        { ignore: [404] }
      )
    : undefined;
  // exit early if a 404 isn't from elasticsearch
  if (
    bulkGetResponse &&
    isNotFoundFromUnsupportedServer({
      statusCode: bulkGetResponse.statusCode,
      headers: bulkGetResponse.headers,
    })
  ) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
  }

  let getResponseIndex = 0;
  let aliasSpacesIndex = 0;
  const results: PreflightCheckForCreateResult[] = [];
  for (const either of aliasConflictsOrObjectsToGet) {
    if (isLeft(either)) {
      const { type, id, spacesWithConflictingAliases } = either.value;
      const error = {
        type: 'aliasConflict' as const,
        metadata: { spacesWithConflictingAliases },
      };
      results.push({ type, id, error });
    } else {
      const { type, id, spaces, overwrite, checkAliases } = either.value;
      const objectDoc = bulkGetResponse?.body.docs[getResponseIndex++]!;

      if (checkAliases) {
        const spacesWithConflictingAliases: string[] = [];
        for (let i = 0; i < spaces.size; i++) {
          const aliasDoc = bulkGetResponse?.body.docs[getResponseIndex++];
          const index = aliasSpacesIndex++; // increment whether the alias was found or not
          if (aliasDoc?.found) {
            const legacyUrlAlias: LegacyUrlAlias = aliasDoc._source![LEGACY_URL_ALIAS_TYPE];
            if (!legacyUrlAlias.disabled) {
              // the alias was found, so the space we checked in has a conflicting alias
              // in case the space in the alias's raw ID does not match the space in its sourceSpace field, prefer the former
              spacesWithConflictingAliases.push(aliasSpaces[index]);
            }
          }
        }
        if (spacesWithConflictingAliases.length) {
          const error = {
            type: 'aliasConflict' as const,
            metadata: { spacesWithConflictingAliases },
          };
          results.push({ type, id, error });
          continue;
        }
      }

      let existingDocument: PreflightCheckForCreateResult['existingDocument'];
      if (objectDoc.found) {
        // @ts-expect-error MultiGetHit._source is optional
        if (!rawDocExistsInNamespaces(registry, objectDoc, [...spaces])) {
          const error = {
            type: 'unresolvableConflict' as const,
            metadata: { isNotOverwritable: true },
          };
          results.push({ type, id, error });
          continue;
        } else if (!overwrite) {
          const error = { type: 'conflict' as const };
          results.push({ type, id, error });
          continue;
        }
        existingDocument = objectDoc as SavedObjectsRawDoc;
      }
      results.push({ type, id, existingDocument });
    }
  }
  return results;
}

function intersection<T>(a: Set<T>, b: Set<T>) {
  const result: T[] = [];
  for (const x of a) {
    if (b.has(x)) {
      result.push(x);
    }
  }
  return result;
}
