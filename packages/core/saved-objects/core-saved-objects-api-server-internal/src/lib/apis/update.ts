/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SavedObjectsErrorHelpers,
  type SavedObject,
  type SavedObjectSanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  decodeRequestVersion,
  encodeHitVersion,
} from '@kbn/core-saved-objects-base-server-internal';
import type {
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import { DEFAULT_REFRESH_SETTING, DEFAULT_RETRY_COUNT } from '../constants';
import { isValidRequest } from '../utils';
import { getCurrentTime, getSavedObjectFromSource, mergeForUpdate } from './utils';
import type { ApiExecutionContext } from './types';

export interface PerformUpdateParams<T = unknown> {
  type: string;
  id: string;
  attributes: T;
  options: SavedObjectsUpdateOptions<T>;
}

export const performUpdate = async <T>(
  updateParams: PerformUpdateParams<T>,
  apiContext: ApiExecutionContext
): Promise<SavedObjectsUpdateResponse<T>> => {
  const { type, id, options } = updateParams;
  const { allowedTypes, helpers } = apiContext;
  const namespace = helpers.common.getCurrentNamespace(options.namespace);

  // check request is valid
  const { validRequest, error } = isValidRequest({ allowedTypes, type, id });
  if (!validRequest && error) {
    throw error;
  }

  const maxAttempts = options.version ? 1 : 1 + DEFAULT_RETRY_COUNT;

  // handle retryOnConflict manually by reattempting the operation in case of conflict errors
  let response: SavedObjectsUpdateResponse<T>;
  for (let currentAttempt = 1; currentAttempt <= maxAttempts; currentAttempt++) {
    try {
      response = await executeUpdate(updateParams, apiContext, { namespace });
      break;
    } catch (e) {
      if (
        SavedObjectsErrorHelpers.isConflictError(e) &&
        e.retryableConflict &&
        currentAttempt < maxAttempts
      ) {
        continue;
      }
      throw e;
    }
  }

  return response!;
};

export const executeUpdate = async <T>(
  { id, type, attributes, options }: PerformUpdateParams<T>,
  { registry, helpers, client, serializer, extensions = {}, logger }: ApiExecutionContext,
  { namespace }: { namespace: string | undefined }
): Promise<SavedObjectsUpdateResponse<T>> => {
  const {
    common: commonHelper,
    encryption: encryptionHelper,
    preflight: preflightHelper,
    migration: migrationHelper,
    validation: validationHelper,
    user: userHelper,
  } = helpers;
  const { securityExtension } = extensions;
  const typeDefinition = registry.getType(type)!;
  const {
    version,
    references,
    upsert,
    refresh = DEFAULT_REFRESH_SETTING,
    migrationVersionCompatibility,
  } = options;

  // Preflight calls to get the doc and check namespaces for multinamespace types.
  const preflightDocResult = await preflightHelper.preflightGetDocForUpdate({
    type,
    id,
    namespace,
  });

  const preflightDocNSResult = preflightHelper.preflightCheckNamespacesForUpdate({
    type,
    id,
    namespace,
    preflightDocResult,
  });

  const existingNamespaces = preflightDocNSResult.savedObjectNamespaces ?? [];
  const authorizationResult = await securityExtension?.authorizeUpdate({
    namespace,
    object: { type, id, existingNamespaces },
  });

  // validate if an update (directly update or create the object instead) can be done, based on if the doc exists or not
  const docOutsideNamespace = preflightDocNSResult?.checkResult === 'found_outside_namespace';
  const docNotFound =
    preflightDocNSResult?.checkResult === 'not_found' ||
    preflightDocResult.checkDocFound === 'not_found';

  // doc not in namespace, or doc not found but we're not upserting => throw 404
  if (docOutsideNamespace || (docNotFound && !upsert)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }

  if (upsert && preflightDocNSResult?.checkResult === 'not_found') {
    // we only need to check multi-namespace objects. Single and agnostic types do not have aliases.
    // throws SavedObjectsErrorHelpers.createConflictError(type, id) if there is one
    await preflightHelper.preflightCheckForUpsertAliasConflict(type, id, namespace);
  }

  // migrate the existing doc to the current version
  let migrated: SavedObject<T>;
  if (preflightDocResult.checkDocFound === 'found') {
    const document = getSavedObjectFromSource<T>(
      registry,
      type,
      id,
      preflightDocResult.rawDocSource!,
      { migrationVersionCompatibility }
    );
    try {
      migrated = migrationHelper.migrateStorageDocument(document) as SavedObject<T>;
    } catch (migrateStorageDocError) {
      throw SavedObjectsErrorHelpers.decorateGeneralError(
        migrateStorageDocError,
        'Failed to migrate document to the latest version.'
      );
    }
  }
  // END ALL PRE_CLIENT CALL CHECKS && MIGRATE EXISTING DOC;

  const time = getCurrentTime();
  const updatedBy = userHelper.getCurrentUserProfileUid();
  let updatedOrCreatedSavedObject: SavedObject<T>;
  // `upsert` option set and document was not found -> we need to perform an upsert operation
  const shouldPerformUpsert = upsert && docNotFound;

  let savedObjectNamespace: string | undefined;
  let savedObjectNamespaces: string[] | undefined;

  if (namespace && registry.isSingleNamespace(type)) {
    savedObjectNamespace = namespace;
  } else if (registry.isMultiNamespace(type)) {
    savedObjectNamespaces = preflightDocNSResult.savedObjectNamespaces;
  }

  // UPSERT CASE START
  if (shouldPerformUpsert) {
    // ignore attributes if creating a new doc: only use the upsert attributes
    // don't include upsert if the object already exists; ES doesn't allow upsert in combination with version properties
    const migratedUpsert = migrationHelper.migrateInputDocument({
      id,
      type,
      ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
      ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
      attributes: {
        ...(await encryptionHelper.optionallyEncryptAttributes(type, id, namespace, upsert)),
      },
      created_at: time,
      updated_at: time,
      ...(updatedBy && { created_by: updatedBy, updated_by: updatedBy }),
      ...(Array.isArray(references) && { references }),
    }) as SavedObjectSanitizedDoc<T>;
    validationHelper.validateObjectForCreate(type, migratedUpsert);
    const rawUpsert = serializer.savedObjectToRaw(migratedUpsert);

    const createRequestParams = {
      id: rawUpsert._id,
      index: commonHelper.getIndexForType(type),
      refresh,
      body: rawUpsert._source,
      ...(version ? decodeRequestVersion(version) : {}),
      require_alias: true,
    };

    const {
      body: createDocResponseBody,
      statusCode,
      headers,
    } = await client.create(createRequestParams, { meta: true }).catch((err) => {
      if (SavedObjectsErrorHelpers.isEsUnavailableError(err)) {
        throw err;
      }
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        // see "404s from missing index" above
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      if (SavedObjectsErrorHelpers.isConflictError(err)) {
        // flag the error as being caused by an update conflict
        err.retryableConflict = true;
      }
      throw err;
    });
    if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(id, type);
    }
    // client.create doesn't return the index document.
    // Use rawUpsert as the _source
    const upsertedSavedObject = serializer.rawToSavedObject<T>(
      {
        ...rawUpsert,
        ...createDocResponseBody,
      },
      { migrationVersionCompatibility }
    );
    const { originId } = upsertedSavedObject ?? {};
    let namespaces: string[] = [];
    if (!registry.isNamespaceAgnostic(type)) {
      namespaces = upsertedSavedObject.namespaces ?? [
        SavedObjectsUtils.namespaceIdToString(upsertedSavedObject.namespace),
      ];
    }

    updatedOrCreatedSavedObject = {
      id,
      type,
      created_at: time,
      updated_at: time,
      ...(updatedBy && { created_by: updatedBy, updated_by: updatedBy }),
      version: encodeHitVersion(createDocResponseBody),
      namespaces,
      ...(originId && { originId }),
      references,
      attributes: upsert, // these ignore the attribute values provided in the main request body.
    } as SavedObject<T>;

    // UPSERT CASE END
  } else {
    // UPDATE CASE START
    // at this point, we already know 1. the document exists 2. we're not doing an upsert
    // therefor we can safely process with the "standard" update sequence.

    const mergeAttributes = options.mergeAttributes ?? true;
    const encryptedUpdatedAttributes = await encryptionHelper.optionallyEncryptAttributes(
      type,
      id,
      namespace,
      attributes
    );

    const updatedAttributes = mergeAttributes
      ? mergeForUpdate({
          targetAttributes: {
            ...(migrated!.attributes as Record<string, unknown>),
          },
          updatedAttributes: encryptedUpdatedAttributes,
          typeMappings: typeDefinition.mappings,
        })
      : encryptedUpdatedAttributes;

    const migratedUpdatedSavedObjectDoc = migrationHelper.migrateInputDocument({
      ...migrated!,
      id,
      type,
      // need to override the redacted NS values from the decrypted/migrated document
      namespace: savedObjectNamespace,
      namespaces: savedObjectNamespaces,
      attributes: updatedAttributes,
      updated_at: time,
      updated_by: updatedBy,
      ...(Array.isArray(references) && { references }),
    });

    const docToSend = serializer.savedObjectToRaw(
      migratedUpdatedSavedObjectDoc as SavedObjectSanitizedDoc
    );

    // implement creating the call params
    const indexRequestParams = {
      id: docToSend._id,
      index: commonHelper.getIndexForType(type),
      refresh,
      body: docToSend._source,
      // using version from the source doc if not provided as option to avoid erasing changes in case of concurrent calls
      ...decodeRequestVersion(version || migrated!.version),
      require_alias: true,
    };

    const {
      body: indexDocResponseBody,
      statusCode,
      headers,
    } = await client.index(indexRequestParams, { meta: true }).catch((err) => {
      if (SavedObjectsErrorHelpers.isEsUnavailableError(err)) {
        throw err;
      }
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        // see "404s from missing index" above
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      if (SavedObjectsErrorHelpers.isConflictError(err)) {
        // flag the error as being caused by an update conflict
        err.retryableConflict = true;
      }
      throw err;
    });
    // throw if we can't verify a 404 response is from Elasticsearch
    if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(id, type);
    }
    // client.index doesn't return the indexed document.
    // Rather than making another round trip to elasticsearch to fetch the doc, we use the SO we sent
    // rawToSavedObject adds references as [] if undefined
    const updatedSavedObject = serializer.rawToSavedObject<T>(
      {
        ...docToSend,
        ...indexDocResponseBody,
      },
      { migrationVersionCompatibility }
    );

    const { originId } = updatedSavedObject ?? {};
    let namespaces: string[] = [];
    if (!registry.isNamespaceAgnostic(type)) {
      namespaces = updatedSavedObject.namespaces ?? [
        SavedObjectsUtils.namespaceIdToString(updatedSavedObject.namespace),
      ];
    }

    updatedOrCreatedSavedObject = {
      id,
      type,
      updated_at: time,
      ...(updatedBy && { updated_by: updatedBy }),
      version: encodeHitVersion(indexDocResponseBody),
      namespaces,
      ...(originId && { originId }),
      references,
      attributes,
    } as SavedObject<T>;
  }

  return encryptionHelper.optionallyDecryptAndRedactSingleResult(
    updatedOrCreatedSavedObject!,
    authorizationResult?.typeMap,
    shouldPerformUpsert ? upsert : attributes
  );
};
