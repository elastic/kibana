/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MgetResponseItem } from '@elastic/elasticsearch/lib/api/types';

import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type {
  SavedObjectsBulkResolveObject,
  SavedObjectsResolveOptions,
  SavedObjectsResolveResponse,
  SavedObjectsIncrementCounterField,
  SavedObjectsIncrementCounterOptions,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  type SavedObjectsRawDocSource,
  type SavedObject,
  type BulkResolveError,
  type ISavedObjectsSerializer,
  type WithAuditName,
  SavedObjectsErrorHelpers,
} from '@kbn/core-saved-objects-server';
import {
  LEGACY_URL_ALIAS_TYPE,
  type LegacyUrlAlias,
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
  left,
  right,
} from '../utils';
import type { ApiExecutionContext } from '../types';
import type { RepositoryEsClient } from '../../repository_es_client';

const MAX_CONCURRENT_RESOLVE = 10;

/**
 * Parameters for the internal bulkResolve function.
 *
 * @internal
 */
export interface InternalBulkResolveParams {
  objects: SavedObjectsBulkResolveObject[];
  options?: SavedObjectsResolveOptions;
  incrementCounterInternal: <T = unknown>(
    type: string,
    id: string,
    counterFields: Array<string | SavedObjectsIncrementCounterField>,
    options?: SavedObjectsIncrementCounterOptions<T>
  ) => Promise<SavedObject<T>>;
}

/**
 * The response when objects are resolved.
 *
 * @public
 */
export interface InternalSavedObjectsBulkResolveResponse<T = unknown> {
  resolved_objects: Array<SavedObjectsResolveResponse<T> | BulkResolveError>;
}

/** Type guard used in the repository. */
export function isBulkResolveError<T>(
  result: SavedObjectsResolveResponse<T> | BulkResolveError
): result is BulkResolveError {
  return !!(result as BulkResolveError).error;
}

type AliasInfo = Pick<LegacyUrlAlias, 'targetId' | 'purpose'>;

export async function internalBulkResolve<T>(
  params: InternalBulkResolveParams,
  apiExecutionContext: ApiExecutionContext
): Promise<InternalSavedObjectsBulkResolveResponse<T>> {
  const { incrementCounterInternal, objects, options = {} } = params;

  const { registry, allowedTypes, client, serializer } = apiExecutionContext;
  const { common: commonHelper, migration: migrationHelper } = apiExecutionContext.helpers;
  const { securityExtension } = apiExecutionContext.extensions;

  if (objects.length === 0) {
    return { resolved_objects: [] };
  }

  const allObjects = validateObjectTypes(objects, allowedTypes);
  const validObjects = allObjects.filter(isRight);

  const namespace = normalizeNamespace(options.namespace);
  const { migrationVersionCompatibility } = options;

  const aliasDocs = await fetchAndUpdateAliases(
    validObjects,
    client,
    serializer,
    commonHelper.getIndexForType.bind(commonHelper),
    namespace
  );

  const docsToBulkGet: Array<{ _id: string; _index: string }> = [];
  const aliasInfoArray: Array<AliasInfo | undefined> = [];
  validObjects.forEach(({ value: { type, id } }, i) => {
    const objectIndex = commonHelper.getIndexForType(type);
    docsToBulkGet.push({
      // attempt to find an exact match for the given ID
      _id: serializer.generateRawId(namespace, type, id),
      _index: objectIndex,
    });
    const aliasDoc = aliasDocs[i];
    if (aliasDoc?.found) {
      const legacyUrlAlias: LegacyUrlAlias = aliasDoc._source![LEGACY_URL_ALIAS_TYPE];
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
        { docs: docsToBulkGet },
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
    // @ts-expect-error MultiGetHit._source is optional
    const object = getSavedObjectFromSource<T>(registry, objectType, objectId, doc, {
      migrationVersionCompatibility,
    });
    // migrate and decrypt document
    return await migrationHelper.migrateAndDecryptStorageDocument({
      document: object,
      typeMap: undefined,
    });
  }

  // map function for pMap below
  const mapper = async (either: Either<BulkResolveError, SavedObjectsBulkResolveObject>) => {
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

    try {
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

      if (result && securityExtension) {
        (result.saved_object as WithAuditName<SavedObject>).name = SavedObjectsUtils.getName(
          registry.getNameAttribute(type),
          result.saved_object
        );
      }
    } catch (error) {
      return {
        id,
        type,
        error: SavedObjectsErrorHelpers.decorateGeneralError(
          error,
          'Failed to migrate document to the latest version.'
        ),
      };
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

  if (!securityExtension) {
    return { resolved_objects: resolvedObjects };
  }

  const redactedObjects = await securityExtension.authorizeAndRedactInternalBulkResolve({
    namespace,
    objects: resolvedObjects,
  });

  return { resolved_objects: redactedObjects };
}

/** Separates valid and invalid object types */
function validateObjectTypes(objects: SavedObjectsBulkResolveObject[], allowedTypes: string[]) {
  return objects.map<Either<BulkResolveError, SavedObjectsBulkResolveObject>>((object) => {
    const { type, id } = object;
    if (!allowedTypes.includes(type)) {
      return left({
        type,
        id,
        error: SavedObjectsErrorHelpers.createUnsupportedTypeError(type),
      });
    }
    return right(object);
  });
}

async function fetchAndUpdateAliases(
  validObjects: Array<Right<SavedObjectsBulkResolveObject>>,
  client: RepositoryEsClient,
  serializer: ISavedObjectsSerializer,
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
    operations: bulkUpdateDocs,
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
