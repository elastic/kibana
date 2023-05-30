/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isSupportedEsServer } from '@kbn/core-elasticsearch-server-internal';
import {
  SavedObjectsErrorHelpers,
  type SavedObject,
  SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsGetOptions } from '@kbn/core-saved-objects-api-server';
import { isFoundGetResponse, getSavedObjectFromSource, rawDocExistsInNamespace } from './utils';
import { ApiExecutionContext } from './types';

export interface PerformGetParams {
  type: string;
  id: string;
  options: SavedObjectsGetOptions;
}

export const performGet = async <T>(
  { type, id, options }: PerformGetParams,
  {
    registry,
    helpers,
    allowedTypes,
    client,
    migrator,
    serializer,
    extensions = {},
  }: ApiExecutionContext
): Promise<SavedObject<T>> => {
  const {
    common: commonHelper,
    encryption: encryptionHelper,
    migration: migrationHelper,
  } = helpers;
  const { securityExtension } = extensions;

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  const { migrationVersionCompatibility } = options;

  if (!allowedTypes.includes(type)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }
  const { body, statusCode, headers } = await client.get<SavedObjectsRawDocSource>(
    {
      id: serializer.generateRawId(namespace, type, id),
      index: commonHelper.getIndexForType(type),
    },
    { ignore: [404], meta: true }
  );
  const indexNotFound = statusCode === 404;
  // check if we have the elasticsearch header when index is not found and, if we do, ensure it is from Elasticsearch
  if (indexNotFound && !isSupportedEsServer(headers)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(type, id);
  }

  const objectNotFound =
    !isFoundGetResponse(body) ||
    indexNotFound ||
    !rawDocExistsInNamespace(registry, body, namespace);

  const authorizationResult = await securityExtension?.authorizeGet({
    namespace,
    object: {
      type,
      id,
      existingNamespaces: body?._source?.namespaces ?? [],
    },
    objectNotFound,
  });

  if (objectNotFound) {
    // see "404s from missing index" above
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }

  const document = getSavedObjectFromSource<T>(registry, type, id, body, {
    migrationVersionCompatibility,
  });

  let migrated: SavedObject<T>;
  try {
    migrated = migrationHelper.migrateStorageDocument(document) as SavedObject<T>;
  } catch (error) {
    throw SavedObjectsErrorHelpers.decorateGeneralError(
      error,
      'Failed to migrate document to the latest version.'
    );
  }

  return encryptionHelper.optionallyDecryptAndRedactSingleResult(
    migrated,
    authorizationResult?.typeMap
  );
};
