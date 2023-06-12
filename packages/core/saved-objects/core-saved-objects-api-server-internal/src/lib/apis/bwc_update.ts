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
} from '@kbn/core-saved-objects-server';
import { decodeRequestVersion } from '@kbn/core-saved-objects-base-server-internal';
import {
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import { cloneDeep } from 'lodash';
import { DEFAULT_REFRESH_SETTING } from '../constants';
import { getCurrentTime, getSavedObjectFromSource } from './utils';
import { ApiExecutionContext } from './types';
import { PreflightCheckNamespacesResult } from './helpers';

export interface PerformUpdateParams<T = unknown> {
  type: string;
  id: string;
  attributes: T; // ssumptions: attributes and upsert attributes are the same
  options: SavedObjectsUpdateOptions<T>;
}

export const performBWCUpdate = async <T>(
  { id, type, attributes, options }: PerformUpdateParams<T>,
  {
    registry,
    helpers,
    allowedTypes,
    client,
    serializer,
    extensions = {},
    logger,
  }: ApiExecutionContext
): Promise<SavedObjectsUpdateResponse<T>> => {
  const time = getCurrentTime();

  const {
    common: commonHelper,
    validation: validationHelper,
    encryption: encryptionHelper,
    preflight: preflightHelper,
    migration: migrationHelper,
  } = helpers;

  const { securityExtension } = extensions;

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  const {
    version,
    references,
    upsert, // translates to overwrite false if defined, otherwise the doc exists and we overwrite it
    refresh = DEFAULT_REFRESH_SETTING,
    // retryOnConflict = version ? 0 : DEFAULT_RETRY_COUNT, // not an option for `create/index`
    migrationVersionCompatibility,
  } = options;

  let originalDocMigrated: SavedObject<T>;
  /* ================= GLOBAL VALIDATION ================== */
  if (!allowedTypes.includes(type)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }
  if (!id) {
    throw SavedObjectsErrorHelpers.createBadRequestError('id cannot be empty');
  }
  /* ================= PREFLIGHT ================= */
  /* ================= DOC EXISTS VALIDATION: preflight helper ================== */

  logger.info('Checking doc exists');

  const preflightGetDocResult = await preflightHelper.preflightGetDoc({
    type,
    id,
    namespace,
  });

  if (preflightGetDocResult.rawDocSource && preflightGetDocResult.checkDocFound === 'found') {
    const originalDoc = getSavedObjectFromSource<T>(
      registry,
      type,
      id,
      preflightGetDocResult.rawDocSource,
      {
        migrationVersionCompatibility,
      }
    );

    try {
      originalDocMigrated = migrationHelper.migrateStorageDocument(originalDoc) as SavedObject<T>;
    } catch (error) {
      throw SavedObjectsErrorHelpers.decorateGeneralError(
        error,
        'Failed to migrate document to the latest version.'
      );
    }
  }

  /* ================= MULTINAMESPACE TYPES: CHECK NAMESPACES ================== */
  let preflightCheckNamespacesResult: PreflightCheckNamespacesResult | undefined;

  // handling multinamespace types

  if (registry.isMultiNamespace(type)) {
    logger.info('Verifying multi-namespace type');
    preflightCheckNamespacesResult = await preflightHelper.preflightCheckNamespaces({
      type,
      id,
      namespace,
    });
  }
  const existingNamespaces = preflightCheckNamespacesResult?.savedObjectNamespaces ?? [];

  const authorizationResult = await securityExtension?.authorizeUpdate({
    namespace,
    object: { type, id, existingNamespaces },
  });

  /**
   * We're now in a situation where, for multi-namespace types, we've got multiple results
   *  - preflightGetDoc: rawDoc in version the server's on in the current space
   *    - saved object doc in the current version (migrated version from the preflight call)
   *  - preflightCheckNamespaces: rawDoc in the version the server's on in the default space
   */
  if (
    preflightCheckNamespacesResult?.checkResult === 'found_outside_namespace' ||
    (!upsert && preflightCheckNamespacesResult?.checkResult === 'not_found')
  ) {
    logger.error('original object not in namespace, cannot update');
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }
  if (upsert && preflightCheckNamespacesResult?.checkResult === 'not_found') {
    logger.info('upsert requested: original doc not found, checking for alias conflicts');
    // If an upsert would result in the creation of a new object, we need to check for alias conflicts too.
    // This takes an extra round trip to Elasticsearch, but this won't happen often.
    // TODO: improve performance by combining these into a single preflight check
    await preflightHelper.preflightCheckForUpsertAliasConflict(type, id, namespace);
  }
  /* ================= IMPLEMENTATION: UPSERT CASE ================== */
  // TODO: implement retrieving from preflightMeta here.
  // Upsert case:
  //  needs: preflightCheckNamespacesResult,
  //  sets: rawUpsert: SavedObjectsRawDoc | undefined
  // initialize these as: { preflightCheckNamespacesResult, rawUpsert}
  //   // Meta: {preflightCheckNamespacesResult, rawUpsert, preflightGetDocResult, raw}

  let rawUpsert: SavedObjectsRawDoc | undefined;
  // don't include upsert if the object already exists; ES doesn't allow upsert in combination with version properties
  if (
    upsert &&
    (!preflightCheckNamespacesResult || preflightCheckNamespacesResult.checkResult === 'not_found')
  ) {
    let savedObjectNamespace: string | undefined;
    let savedObjectNamespaces: string[] | undefined;

    if (registry.isSingleNamespace(type) && namespace) {
      savedObjectNamespace = namespace;
    } else if (registry.isMultiNamespace(type)) {
      savedObjectNamespaces = preflightCheckNamespacesResult!.savedObjectNamespaces;
    }

    /** Handle `upsert` case for creating a doc with given id. We migrate it first to bring it to a version this instance of Kibana can handle*/
    const migrated = migrationHelper.migrateInputDocument({
      id,
      type,
      ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
      ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
      attributes: {
        ...(await encryptionHelper.optionallyEncryptAttributes(type, id, namespace, upsert)),
      },
      updated_at: time,
    });

    /**
     * If a validation has been registered for this type, we run it against the migrated attributes.
     * This is an imperfect solution because malformed attributes could have already caused the
     * migration to fail, but it's the best we can do without devising a way to run validations
     * inside the migration algorithm itself.
     */
    validationHelper.validateObjectForCreate(type, migrated as SavedObjectSanitizedDoc<T>); // casting here because we add
    rawUpsert = serializer.savedObjectToRaw(migrated as SavedObjectSanitizedDoc<T>);
  }
  const rawUpsertRequestParams = rawUpsert && {
    id: rawUpsert._id,
    index: commonHelper.getIndexForType(type),
    refresh,
    body: rawUpsert._source,
    ...(version ? decodeRequestVersion(version) : {}),
    require_alias: true,
  };

  const {
    body: createBody,
    statusCode: createStatusCode,
    headers: createHeaders,
  } = await client.create(rawUpsertRequestParams!, { meta: true });

  // throw if we can't verify a 404 response is from Elasticsearch
  if (isNotFoundFromUnsupportedServer({ statusCode: createStatusCode, headers: createHeaders })) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(id, type);
  }
  // CREATE THE RESPONSE
  const upsertUpdateResult = serializer.rawToSavedObject<T>(
    { ...rawUpsert!, ...createBody },
    { migrationVersionCompatibility }
  );
  const upsertResult = { ...upsertUpdateResult, ...(Array.isArray(references) && { references }) };

  return encryptionHelper.optionallyDecryptAndRedactSingleResult(
    upsertResult,
    authorizationResult?.typeMap,
    attributes
  );

  // FINISHED UPSERT CASE

  /* ================= PARTIAL UPDATE CASE (!upsert) ================== */

  let migratedDoc: SavedObject<T>;
  const { rawDocSource: rawDoc } = preflightGetDocResult;
  // if we're not upserting, and the original doc we want to update doesn't exist, throw.
  if (!rawDoc) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(id, type);
  }

  logger.info('update requested: original doc found');

  const originalD = getSavedObjectFromSource<T>(registry, type, id, rawDoc!, {
    migrationVersionCompatibility,
  });
  try {
    migratedDoc = migrationHelper.migrateStorageDocument(document) as SavedObject<T>;
  } catch (error) {
    throw SavedObjectsErrorHelpers.decorateGeneralError(
      error,
      'Failed to migrate document to the latest version.'
    );
  }
  const originalMigratedDoc = cloneDeep(migratedDoc);
  // client-side update
  const updatedDocWithoutUpsert = {
    ...originalMigratedDoc,
    attributes: {
      ...originalMigratedDoc.attributes, // QUESTION: do we need to encrypt these again?
      ...attributes, // overwrite those with PerformUpdateParams['attributes']
    },
  };
  const doc = migrationHelper.migrateInputDocument({
    ...updatedDocWithoutUpsert,
    attributes: {
      ...(await encryptionHelper.optionallyEncryptAttributes(
        type,
        id,
        namespace,
        updatedDocWithoutUpsert.attributes
      )),
    },
    updated_at: time,
  });
  validationHelper.validateObjectForCreate(type, doc as SavedObjectSanitizedDoc<T>);
  const raw = serializer.savedObjectToRaw(doc as SavedObjectSanitizedDoc<T>);
  /**
   * If a validation has been registered for this type, we run it against the migrated attributes.
   * This is an imperfect solution because malformed attributes could have already caused the
   * migration to fail, but it's the best we can do without devising a way to run validations
   * inside the migration algorithm itself.
   */

  const updatedDocRequestParams = {
    id: raw._id,
    index: commonHelper.getIndexForType(type),
    refresh,
    body: raw._source,
    ...(version ? decodeRequestVersion(version) : {}),
    require_alias: true,
  };

  const {
    body: indexBody,
    statusCode: indexStatusCode,
    headers: indexHeaders,
  } = await client.index(updatedDocRequestParams, { meta: true });

  // throw if we can't verify a 404 response is from Elasticsearch
  if (isNotFoundFromUnsupportedServer({ statusCode: indexStatusCode, headers: indexHeaders })) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(id, type);
  }

  // CREATE THE RESPONSE
  // `update` responds with <SavedObject<T>>, as does `create/index` and we don't have to modify anything
  const partialUpdateResult = serializer.rawToSavedObject<T>(
    { ...raw, ...indexBody },
    { migrationVersionCompatibility }
  );
  const createResult = { ...partialUpdateResult, ...(Array.isArray(references) && { references }) };
  return encryptionHelper.optionallyDecryptAndRedactSingleResult(
    createResult,
    authorizationResult?.typeMap,
    attributes
  );

  // FINISHED "PARTIAL UPDATE" CASE (indexing the full doc from client-side update)
};

/**
I can combine final result generation with:
combined = upsert ? rawUpsert : raw
responseBody = upsert ? createBody : indexBody

serializer.rawToSavedObject<T>({...combined, responseBody})
 */
