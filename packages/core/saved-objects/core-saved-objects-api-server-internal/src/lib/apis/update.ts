/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectsErrorHelpers,
  type SavedObject,
  type SavedObjectSanitizedDoc,
  SavedObjectsRawDoc,
  SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { encodeHitVersion } from '@kbn/core-saved-objects-base-server-internal';
import {
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import { DEFAULT_REFRESH_SETTING, DEFAULT_RETRY_COUNT } from '../constants';
import { getCurrentTime, getExpectedVersionProperties } from './utils';
import { ApiExecutionContext } from './types';
import { isValidRequest } from '../utils';
import { errorMap } from '../utils';

/**
 * Downward compatible update control flow types
 */
// temp interface for progress conditionals
export interface UpdateState<A = boolean> {
  validRequest?: A;
  docExists?: A;
  canUpdate?: A;
  updateSuccessful?: A;
  updateVersionConflict?: A;
  retryRequest?: A;
  shouldCreate?: A;
  allowedToCreate?: A;
  createSuccessful?: A;
}

export interface PerformUpdateParams<T = unknown> {
  type: string;
  id: string;
  attributes: T;
  options: SavedObjectsUpdateOptions<T>;
}

export const performUpdate = async <T>(
  { id, type, attributes, options }: PerformUpdateParams<T>,
  {
    registry,
    helpers,
    allowedTypes,
    client,
    serializer,
    migrator,
    extensions = {},
    logger,
  }: ApiExecutionContext
): Promise<SavedObjectsUpdateResponse<T>> => {
  const {
    common: commonHelper,
    encryption: encryptionHelper,
    preflight: preflightHelper,
    migration: migrationHelper,
  } = helpers;
  const { securityExtension } = extensions;

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  // check request is valid
  const { validRequest, error } = isValidRequest({ allowedTypes, type, id });
  if (!validRequest && error) {
    logger.warn(error.message); // at least log what went wrong.
    throw error;
  }

  const {
    version,
    references,
    upsert,
    refresh = DEFAULT_REFRESH_SETTING,
    retryOnConflict = version ? 0 : DEFAULT_RETRY_COUNT,
    migrationVersionCompatibility,
  } = options;

  // variables that are accessible outside of individual conditionals

  // get the doc before checking namespaces for multinamespace types.
  const preflightGetDocForUpdateResult = await preflightHelper.preflightGetDocForUpdate({
    type,
    id,
    namespace,
  });

  // migrate now? We're still checking if the request can be performed.

  const preflightCheckNamespacesForUpdateResult =
    await preflightHelper.preflightCheckNamespacesForUpdate({
      type,
      id,
      namespace,
      preflightGetDocForUpdateResult,
    });

  const existingNamespaces = preflightCheckNamespacesForUpdateResult?.savedObjectNamespaces ?? [];

  const authorizationResult = await securityExtension?.authorizeUpdate({
    namespace,
    object: { type, id, existingNamespaces },
  });

  // validating if an update (directly update or create the object instead) can be done, based on if the doc exists or not
  // extract into canUpdate and canUpsert method instead where it mustn't be possible for BOTH to be true. It's either an update existing thing or create non-existing thing
  // can perform request START
  if (
    preflightCheckNamespacesForUpdateResult?.checkResult === 'found_outside_namespace' ||
    (!upsert && preflightCheckNamespacesForUpdateResult?.checkResult === 'not_found')
  ) {
    const mappedError = errorMap(
      logger,
      'saved object not found',
      SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)
    );
    throw mappedError;
  }
  // test exists for can't find a doc to update but tests the namespaces check for update with a multi-namespace isolated type
  // Adds explicitly protect against doc not found for request that doesn't include upsert
  // `throws when ES is unable to find the document during get with upsert not declared
  if (
    !registry.isMultiNamespace(type) &&
    !upsert &&
    preflightGetDocForUpdateResult.checkDocFound === 'not_found'
  ) {
    const mappedError = errorMap(
      logger,
      'cannot update doc',
      SavedObjectsErrorHelpers.createBadRequestError('cannot update doc')
    );
    throw mappedError;
  }
  if (upsert && preflightCheckNamespacesForUpdateResult?.checkResult === 'not_found') {
    // we only need to check multi-namespace objects. Single and agnostic types do not have aliases.
    // throws SavedObjectsErrorHelpers.createConflictError(type, id) if there is one
    await preflightHelper.preflightCheckForUpsertAliasConflict(type, id, namespace);
  }
  // END ALL PRE_CLIENT CALL CHECKS;

  // MIGRATE EXISTING DOC IF THERE IS ONE START.
  // For implementations, see https://github.com/elastic/kibana/pull/158251/files#diff-d95c8ca5c3f61caa523ceed8ae8665eb34d0fcd198e85870286d0c8c2ddbcef4R242
  let migratedDocFromGet: SavedObject<T>;
  if (preflightGetDocForUpdateResult.savedObjectFromRawDoc) {
    try {
      migratedDocFromGet = migrationHelper.migrateStorageDocument(
        preflightGetDocForUpdateResult.savedObjectFromRawDoc
      ) as SavedObject<T>;
    } catch (migrateStorageDocError) {
      const mappedError = errorMap(
        logger,
        'saved object migrateStorageDocument error',
        migrateStorageDocError
      );
      throw mappedError;
    }
  }
  console.log('migratedDocFromGet', migratedDocFromGet!);

  // MIGRATE EXISTING DOC IF THERE IS ONE END
  const time = getCurrentTime();

  // UPSERT CASE START
  let rawUpsert: SavedObjectsRawDoc | undefined;
  // don't include upsert if the object already exists; ES doesn't allow upsert in combination with version properties
  if (
    (upsert &&
      preflightGetDocForUpdateResult &&
      preflightGetDocForUpdateResult.checkDocFound === 'not_found') ||
    (preflightCheckNamespacesForUpdateResult &&
      preflightCheckNamespacesForUpdateResult.checkResult === 'not_found')
  ) {
    let savedObjectNamespace: string | undefined;
    let savedObjectNamespaces: string[] | undefined;

    if (registry.isSingleNamespace(type) && namespace) {
      savedObjectNamespace = namespace;
    } else if (registry.isMultiNamespace(type)) {
      savedObjectNamespaces = preflightCheckNamespacesForUpdateResult!.savedObjectNamespaces;
    }

    const migratedUpsert = migrationHelper.migrateInputDocument({
      id,
      type,
      ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
      ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
      attributes: {
        ...(await encryptionHelper.optionallyEncryptAttributes(type, id, namespace, upsert)),
      },
      updated_at: time,
      created_at: time,
    });
    rawUpsert = serializer.savedObjectToRaw(migratedUpsert as SavedObjectSanitizedDoc);
  }
  // DO CLIENT_SIDE UPDATE DOC
  // need to convert migratedDocFromGet from SavedObject<T> to a SavedObjectSanitizedDoc<unknown> typw
  // UPSERT CASE END
  // UPDATE CASE START
  const doc = {
    [type]: await encryptionHelper.optionallyEncryptAttributes(type, id, namespace, attributes),
    updated_at: time,
    ...(Array.isArray(references) && { references }),
  };
  // UPDATE CASE END

  // implement creating the call params
  const body = await client
    .update<unknown, unknown, SavedObjectsRawDocSource>({
      id: serializer.generateRawId(namespace, type, id),
      index: commonHelper.getIndexForType(type),
      ...getExpectedVersionProperties(version),
      refresh,
      retry_on_conflict: retryOnConflict,
      body: {
        doc,
        ...(rawUpsert && { upsert: rawUpsert._source }),
      },
      _source_includes: ['namespace', 'namespaces', 'originId'],
      require_alias: true,
    })
    .catch((err) => {
      if (SavedObjectsErrorHelpers.isEsUnavailableError(err)) {
        throw err;
      }
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        // see "404s from missing index" above
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      throw err;
    });

  const { originId } = body.get?._source ?? {};
  let namespaces: string[] = [];
  if (!registry.isNamespaceAgnostic(type)) {
    namespaces = body.get?._source.namespaces ?? [
      SavedObjectsUtils.namespaceIdToString(body.get?._source.namespace),
    ];
  }

  const result = {
    id,
    type,
    updated_at: time,
    version: encodeHitVersion(body),
    namespaces,
    ...(originId && { originId }),
    references,
    attributes,
  } as SavedObject<T>;

  return encryptionHelper.optionallyDecryptAndRedactSingleResult(
    result,
    authorizationResult?.typeMap,
    attributes
  );
};
