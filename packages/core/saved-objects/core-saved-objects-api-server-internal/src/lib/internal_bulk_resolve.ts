/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MgetResponseItem } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type { SavedObject } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectsBaseOptions,
  SavedObjectsBulkResolveObject,
  SavedObjectsResolveResponse,
  SavedObjectsIncrementCounterField,
  SavedObjectsIncrementCounterOptions,
} from '@kbn/core-saved-objects-api-server';
import {
  AuditAction,
  type ISavedObjectsEncryptionExtension,
  type ISavedObjectsSecurityExtension,
  type ISavedObjectTypeRegistry,
  type SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import {
  SavedObjectsErrorHelpers,
  SavedObjectsUtils,
  type DecoratedError,
} from '@kbn/core-saved-objects-utils-server';
import {
  LEGACY_URL_ALIAS_TYPE,
  type LegacyUrlAlias,
  type SavedObjectsSerializer,
} from '@kbn/core-saved-objects-base-server-internal';
import {
  CORE_USAGE_STATS_ID,
  CORE_USAGE_STATS_TYPE,
  REPOSITORY_RESOLVE_OUTCOME_STATS,
} from '@kbn/core-usage-data-base-server-internal';
import pMap from 'p-map';
import {
  getCurrentTime,
  getSavedObjectFromSource,
  normalizeNamespace,
  rawDocExistsInNamespace,
  type Either,
  type Right,
  isLeft,
  isRight,
} from './internal_utils';
import type { RepositoryEsClient } from './repository_es_client';

const MAX_CONCURRENT_RESOLVE = 10;

/**
 * Parameters for the internal bulkResolve function.
 *
 * @internal
 */
export interface InternalBulkResolveParams {
  registry: ISavedObjectTypeRegistry;
  allowedTypes: string[];
  client: RepositoryEsClient;
  serializer: SavedObjectsSerializer;
  getIndexForType: (type: string) => string;
  incrementCounterInternal: <T = unknown>(
    type: string,
    id: string,
    counterFields: Array<string | SavedObjectsIncrementCounterField>,
    options?: SavedObjectsIncrementCounterOptions<T>
  ) => Promise<SavedObject<T>>;
  encryptionExtension: ISavedObjectsEncryptionExtension | undefined;
  securityExtension: ISavedObjectsSecurityExtension | undefined;
  objects: SavedObjectsBulkResolveObject[];
  options?: SavedObjectsBaseOptions;
}

/**
 * The response when objects are resolved.
 *
 * @public
 */
export interface InternalSavedObjectsBulkResolveResponse<T = unknown> {
  resolved_objects: Array<SavedObjectsResolveResponse<T> | InternalBulkResolveError>;
}

/**
 * Error result for the internal bulkResolve function.
 *
 * @internal
 */
export interface InternalBulkResolveError {
  type: string;
  id: string;
  error: DecoratedError;
}

/** Type guard used in the repository. */
export function isBulkResolveError<T>(
  result: SavedObjectsResolveResponse<T> | InternalBulkResolveError
): result is InternalBulkResolveError {
  return !!(result as InternalBulkResolveError).error;
}

type AliasInfo = Pick<LegacyUrlAlias, 'targetId' | 'purpose'>;

export async function internalBulkResolve<T>(
  params: InternalBulkResolveParams
): Promise<InternalSavedObjectsBulkResolveResponse<T>> {
  const {
    registry,
    allowedTypes,
    client,
    serializer,
    getIndexForType,
    incrementCounterInternal,
    encryptionExtension,
    securityExtension,
    objects,
    options = {},
  } = params;

  if (objects.length === 0) {
    return { resolved_objects: [] };
  }

  const allObjects = validateObjectTypes(objects, allowedTypes);
  const validObjects = allObjects.filter(isRight);

  const namespace = normalizeNamespace(options.namespace);

  const aliasDocs = await fetchAndUpdateAliases(
    validObjects,
    client,
    serializer,
    getIndexForType,
    namespace
  );

  const docsToBulkGet: Array<{ _id: string; _index: string }> = [];
  const aliasInfoArray: Array<AliasInfo | undefined> = [];
  validObjects.forEach(({ value: { type, id } }, i) => {
    const objectIndex = getIndexForType(type);
    docsToBulkGet.push({
      // attempt to find an exact match for the given ID
      _id: serializer.generateRawId(namespace, type, id),
      _index: objectIndex,
    });
    const aliasDoc = aliasDocs[i];
    if (aliasDoc?.found) {
      const legacyUrlAlias: LegacyUrlAlias = aliasDoc._source[LEGACY_URL_ALIAS_TYPE];
      if (!legacyUrlAlias.disabled) {
        docsToBulkGet.push({
          // also attempt to find a match for the legacy URL alias target ID
          _id: serializer.generateRawId(namespace, type, legacyUrlAlias.targetId),
          _index: objectIndex,
        });
        const { targetId, purpose } = legacyUrlAlias;
        aliasInfoArray.push({ targetId, purpose });
        return;
      }
    }
    aliasInfoArray.push(undefined);
  });

  const bulkGetResponse = docsToBulkGet.length
    ? await client.mget<SavedObjectsRawDocSource>(
        { body: { docs: docsToBulkGet } },
        { ignore: [404], meta: true }
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
  let aliasInfoIndex = 0;

  // Helper function for the map block below
  async function getSavedObject(
    objectType: string,
    objectId: string,
    doc: MgetResponseItem<SavedObjectsRawDocSource>
  ) {
    // Encryption
    // @ts-expect-error MultiGetHit._source is optional
    const object = getSavedObjectFromSource<T>(registry, objectType, objectId, doc);
    if (!encryptionExtension?.isEncryptableType(object.type)) {
      return object;
    }
    return encryptionExtension.decryptOrStripResponseAttributes(object);
  }

  // map function for pMap below
  const mapper = async (
    either: Either<InternalBulkResolveError, SavedObjectsBulkResolveObject>
  ) => {
    if (isLeft(either)) {
      return either.value;
    }
    const exactMatchDoc = bulkGetResponse?.body.docs[getResponseIndex++];
    let aliasMatchDoc: MgetResponseItem<SavedObjectsRawDocSource> | undefined;
    const aliasInfo = aliasInfoArray[aliasInfoIndex++];
    if (aliasInfo !== undefined) {
      aliasMatchDoc = bulkGetResponse?.body.docs[getResponseIndex++];
    }
    const foundExactMatch =
      // @ts-expect-error MultiGetHit._source is optional
      exactMatchDoc.found && rawDocExistsInNamespace(registry, exactMatchDoc, namespace);
    const foundAliasMatch =
      // @ts-expect-error MultiGetHit._source is optional
      aliasMatchDoc?.found && rawDocExistsInNamespace(registry, aliasMatchDoc, namespace);

    const { type, id } = either.value;
    let result: SavedObjectsResolveResponse<T> | null = null;

    if (foundExactMatch && foundAliasMatch) {
      result = {
        saved_object: await getSavedObject(type, id, exactMatchDoc!),
        outcome: 'conflict',
        alias_target_id: aliasInfo!.targetId,
        alias_purpose: aliasInfo!.purpose,
      };
      resolveCounter.recordOutcome(REPOSITORY_RESOLVE_OUTCOME_STATS.CONFLICT);
    } else if (foundExactMatch) {
      result = {
        saved_object: await getSavedObject(type, id, exactMatchDoc!),
        outcome: 'exactMatch',
      };
      resolveCounter.recordOutcome(REPOSITORY_RESOLVE_OUTCOME_STATS.EXACT_MATCH);
    } else if (foundAliasMatch) {
      result = {
        saved_object: await getSavedObject(type, aliasInfo!.targetId, aliasMatchDoc!),
        outcome: 'aliasMatch',
        alias_target_id: aliasInfo!.targetId,
        alias_purpose: aliasInfo!.purpose,
      };
      resolveCounter.recordOutcome(REPOSITORY_RESOLVE_OUTCOME_STATS.ALIAS_MATCH);
    }

    if (result !== null) {
      return result;
    }
    resolveCounter.recordOutcome(REPOSITORY_RESOLVE_OUTCOME_STATS.NOT_FOUND);
    return {
      type,
      id,
      error: SavedObjectsErrorHelpers.createGenericNotFoundError(type, id),
    };
  };

  const resolveCounter = new ResolveCounter();

  const resolvedObjects = await pMap(allObjects, mapper, {
    concurrency: MAX_CONCURRENT_RESOLVE,
  });

  incrementCounterInternal(
    CORE_USAGE_STATS_TYPE,
    CORE_USAGE_STATS_ID,
    resolveCounter.getCounterFields(),
    { refresh: false }
  ).catch(() => {}); // if the call fails for some reason, intentionally swallow the error

  const redacted = await authorizeAuditAndRedact(resolvedObjects, securityExtension, namespace);
  return { resolved_objects: redacted };
}

/**
 * Checks authorization, writes audit events, and redacts namespaces from the bulkResolve response. In other SavedObjectsRepository
 * functions we do this before decrypting attributes. However, because of the bulkResolve logic involved in deciding between the exact match
 * or alias match, it's cleaner to do authorization, auditing, and redaction all afterwards.
 */
async function authorizeAuditAndRedact<T>(
  resolvedObjects: Array<SavedObjectsResolveResponse<T> | InternalBulkResolveError>,
  securityExtension: ISavedObjectsSecurityExtension | undefined,
  namespace: string | undefined
) {
  if (!securityExtension) {
    return resolvedObjects;
  }

  const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
  const typesAndSpaces = new Map<string, Set<string>>();
  const spacesToAuthorize = new Set<string>();
  const auditableObjects: Array<{ type: string; id: string }> = [];

  for (const result of resolvedObjects) {
    let auditableObject: { type: string; id: string } | undefined;
    if (isBulkResolveError(result)) {
      const { type, id, error } = result;
      if (!SavedObjectsErrorHelpers.isBadRequestError(error)) {
        // Only "not found" errors should show up as audit events (not "unsupported type" errors)
        auditableObject = { type, id };
      }
    } else {
      const { type, id, namespaces = [] } = result.saved_object;
      auditableObject = { type, id };
      for (const space of namespaces) {
        spacesToAuthorize.add(space);
      }
    }
    if (auditableObject) {
      auditableObjects.push(auditableObject);
      const spacesToEnforce =
        typesAndSpaces.get(auditableObject.type) ?? new Set([namespaceString]); // Always enforce authZ for the active space
      spacesToEnforce.add(namespaceString);
      typesAndSpaces.set(auditableObject.type, spacesToEnforce);
      spacesToAuthorize.add(namespaceString);
    }
  }

  if (typesAndSpaces.size === 0) {
    // We only had "unsupported type" errors, there are no types to check privileges for, just return early
    return resolvedObjects;
  }

  const authorizationResult = await securityExtension?.performAuthorization({
    actions: new Set(['bulk_get']),
    types: new Set(typesAndSpaces.keys()),
    spaces: spacesToAuthorize,
    enforceMap: typesAndSpaces,
    auditCallback: (error) => {
      for (const { type, id } of auditableObjects) {
        securityExtension.addAuditEvent({
          action: AuditAction.RESOLVE,
          savedObject: { type, id },
          error,
        });
      }
    },
  });

  return resolvedObjects.map((result) => {
    if (isBulkResolveError(result)) {
      return result;
    }
    return {
      ...result,
      saved_object: securityExtension.redactNamespaces({
        typeMap: authorizationResult.typeMap,
        savedObject: result.saved_object,
      }),
    };
  });
}

/** Separates valid and invalid object types */
function validateObjectTypes(objects: SavedObjectsBulkResolveObject[], allowedTypes: string[]) {
  return objects.map<Either<InternalBulkResolveError, SavedObjectsBulkResolveObject>>((object) => {
    const { type, id } = object;
    if (!allowedTypes.includes(type)) {
      return {
        tag: 'Left',
        value: {
          type,
          id,
          error: SavedObjectsErrorHelpers.createUnsupportedTypeError(type),
        },
      };
    }
    return {
      tag: 'Right',
      value: object,
    };
  });
}

async function fetchAndUpdateAliases(
  validObjects: Array<Right<SavedObjectsBulkResolveObject>>,
  client: RepositoryEsClient,
  serializer: SavedObjectsSerializer,
  getIndexForType: (type: string) => string,
  namespace: string | undefined
) {
  if (validObjects.length === 0) {
    return [];
  }

  const time = getCurrentTime();
  const bulkUpdateDocs = validObjects
    .map(({ value: { type, id } }) => [
      {
        update: {
          _id: serializer.generateRawLegacyUrlAliasId(namespace, type, id),
          _index: getIndexForType(LEGACY_URL_ALIAS_TYPE),
          _source: true,
        },
      },
      {
        script: {
          source: `
            if (ctx._source[params.type].disabled != true) {
              if (ctx._source[params.type].resolveCounter == null) {
                ctx._source[params.type].resolveCounter = 1;
              }
              else {
                ctx._source[params.type].resolveCounter += 1;
              }
              ctx._source[params.type].lastResolved = params.time;
              ctx._source.updated_at = params.time;
            }
          `,
          lang: 'painless',
          params: {
            type: LEGACY_URL_ALIAS_TYPE,
            time,
          },
        },
      },
    ])
    .flat();

  const bulkUpdateResponse = await client.bulk({
    refresh: false,
    require_alias: true,
    body: bulkUpdateDocs,
  });
  return bulkUpdateResponse.items.map((item) => {
    // Map the bulk update response to the `_source` fields that were returned for each document
    return item.update?.get;
  });
}
class ResolveCounter {
  private record = new Map<string, number>();

  public recordOutcome(outcome: string) {
    const val = this.record.get(outcome) ?? 0;
    this.record.set(outcome, val + 1);
  }

  public getCounterFields() {
    const counterFields: SavedObjectsIncrementCounterField[] = [];
    let total = 0;
    for (const [fieldName, incrementBy] of this.record.entries()) {
      total += incrementBy;
      counterFields.push({ fieldName, incrementBy });
    }
    if (total > 0) {
      counterFields.push({ fieldName: REPOSITORY_RESOLVE_OUTCOME_STATS.TOTAL, incrementBy: total });
    }
    return counterFields;
  }
}
