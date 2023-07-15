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
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  decodeRequestVersion,
  encodeHitVersion,
} from '@kbn/core-saved-objects-base-server-internal';
import {
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import { merge } from 'lodash';
import { DEFAULT_REFRESH_SETTING, DEFAULT_RETRY_COUNT } from '../constants';
import { getCurrentTime, getSavedObjectFromSource } from './utils';
import { ApiExecutionContext } from './types';
import { isValidRequest, errorMap } from '../utils';

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
  let updatedOrCreatedSavedObject: SavedObject<T>;
  const {
    common: commonHelper,
    encryption: encryptionHelper,
    preflight: preflightHelper,
    migration: migrationHelper,
    validation: validationHelper,
  } = helpers;
  const { securityExtension } = extensions;

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  // check request is valid
  const { validRequest, error } = isValidRequest({ allowedTypes, type, id });
  if (!validRequest && error) throw error;

  const {
    version,
    references,
    upsert,
    refresh = DEFAULT_REFRESH_SETTING,
    retryOnConflict = version ? 0 : DEFAULT_RETRY_COUNT,
    migrationVersionCompatibility,
  } = options;

  // Preflight calls to get the doc and check namespaces for multinamespace types.
  const preflightDocResult = await preflightHelper.preflightGetDocForUpdate({
    type,
    id,
    namespace,
  });

  const preflightDocNSResult = await preflightHelper.preflightCheckNamespacesForUpdate({
    type,
    id,
    namespace,
    preflightDocResult,
  });

  const existingNamespaces = preflightDocNSResult?.savedObjectNamespaces ?? [];

  const authorizationResult = await securityExtension?.authorizeUpdate({
    namespace,
    object: { type, id, existingNamespaces },
  });

  // validate if an update (directly update or create the object instead) can be done, based on if the doc exists or not
  // extract into canUpdate and canUpsert method instead where it mustn't be possible for BOTH to be true. It's either an update existing thing or create non-existing thing
  // can perform request START
  if (
    preflightDocNSResult?.checkResult === 'found_outside_namespace' ||
    (!upsert &&
      (preflightDocNSResult?.checkResult === 'not_found' ||
        preflightDocResult.checkDocFound === 'not_found'))
  ) {
    // error helper
    const mappedError = errorMap(
      logger,
      'saved_object_not_found',
      SavedObjectsErrorHelpers.createGenericNotFoundError(type, id),
      type,
      id
    );
    throw mappedError;
  }

  if (upsert && preflightDocNSResult?.checkResult === 'not_found') {
    // we only need to check multi-namespace objects. Single and agnostic types do not have aliases.
    // throws SavedObjectsErrorHelpers.createConflictError(type, id) if there is one
    await preflightHelper.preflightCheckForUpsertAliasConflict(type, id, namespace);
  }

  // MIGRATE EXISTING DOC IF THERE IS ONE START.
  // For implementations, see https://github.com/elastic/kibana/pull/158251/files#diff-d95c8ca5c3f61caa523ceed8ae8665eb34d0fcd198e85870286d0c8c2ddbcef4R242
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
      const mappedError = errorMap(
        logger,
        'saved object migrateStorageDocument error',
        migrateStorageDocError,
        type,
        id
      );
      throw mappedError;
    }
  }
  // END ALL PRE_CLIENT CALL CHECKS && MIGRATE EXISTING DOC;

  // migrate inputs & make client calls
  const time = getCurrentTime();

  if (upsert) {
    let rawUpsert: SavedObjectsRawDoc | undefined;
    // ignore attributes if creating a new doc: only use the upsert attributes
    // don't include upsert if the object already exists; ES doesn't allow upsert in combination with version properties
    // replace inners of conditional with helper function
    if (
      preflightDocResult?.checkDocFound === 'not_found' ||
      preflightDocNSResult?.checkResult === 'not_found'
    ) {
      let savedObjectNamespace: string | undefined;
      let savedObjectNamespaces: string[] | undefined;

      if (namespace && registry.isSingleNamespace(type)) {
        savedObjectNamespace = namespace;
      } else if (registry.isMultiNamespace(type)) {
        savedObjectNamespaces = preflightDocNSResult.savedObjectNamespaces;
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
        ...(Array.isArray(references) && { references }),
      });
      validationHelper.validateObjectForCreate(type, migratedUpsert as SavedObjectSanitizedDoc<T>);
      rawUpsert = serializer.savedObjectToRaw(migratedUpsert as SavedObjectSanitizedDoc);
    }

    if (typeof rawUpsert !== 'undefined') {
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
        updated_at: time,
        version: encodeHitVersion(createDocResponseBody),
        namespaces,
        ...(originId && { originId }),
        references,
        attributes: upsert, // these ignore the attribute values provided in the main request body.
      } as SavedObject<T>;
    }
  }
  // UPSERT CASE END
  let docToSend: SavedObjectsRawDoc | undefined;
  // UPDATE CASE START:
  // Doc already exists, we use both the attributes from the main request body and any extra ones from upsert. We need to ignore duplicate attribute fields if given in both attributes and upsert
  // DO CLIENT_SIDE UPDATE DOC: I'm assuming that if we reach this point, there hasn't been an error
  if (
    (registry.isMultiNamespace(type) &&
      preflightDocNSResult.checkResult === 'found_in_namespace') ||
    (!registry.isMultiNamespace(type) && preflightDocResult.checkDocFound === 'found')
  ) {
    const migratedUpdatedSavedObjectDoc = migrationHelper.migrateInputDocument({
      ...migrated!,
      id,
      type,
      attributes: await encryptionHelper.optionallyEncryptAttributes(type, id, namespace, {
        ...merge(migrated!.attributes, attributes),
      }),
      updated_at: time,
      ...(Array.isArray(references) && { references }),
    });

    docToSend = serializer.savedObjectToRaw(
      migratedUpdatedSavedObjectDoc as SavedObjectSanitizedDoc
    );
  }

  if (preflightDocResult.checkDocFound === 'found' && !(typeof docToSend === 'undefined')) {
    // implement creating the call params
    const indexRequestParams = {
      id: docToSend._id,
      index: commonHelper.getIndexForType(type),
      refresh,
      body: docToSend._source,
      ...(version ? decodeRequestVersion(version) : {}),
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
      throw err;
    });
    // throw if we can't verify a 404 response is from Elasticsearch
    if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(id, type);
    }
    // client.index doesn't return the indexed document.
    // Rather than making anouther round trip to elasticsearch to fetch the doc, we use the SO we sent
    // rawToSavedObject adds references as [] if undefined
    const updatedSavedObject = serializer.rawToSavedObject<T>(
      {
        ...docToSend,
        ...indexDocResponseBody,
      },
      { migrationVersionCompatibility }
    );

    // NEXT: assume the updatedSavedObject is the updated object we can use to construct the final response.
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
    upsert
  );
};
