/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import {
  SavedObjectsErrorHelpers,
  type SavedObject,
  type SavedObjectSanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { decodeRequestVersion } from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsCreateOptions } from '@kbn/core-saved-objects-api-server';
import { DEFAULT_REFRESH_SETTING } from '../constants';
import type { PreflightCheckForCreateResult } from './internals/preflight_check_for_create';
import { getSavedObjectNamespaces, getCurrentTime, normalizeNamespace, setManaged } from './utils';
import { ApiExecutionContext } from './types';

export interface PerformCreateParams<T = unknown> {
  type: string;
  attributes: T;
  options: SavedObjectsCreateOptions;
}

export const performCreate = async <T>(
  { type, attributes, options }: PerformCreateParams<T>,
  {
    registry,
    helpers,
    allowedTypes,
    client,
    serializer,
    migrator,
    extensions = {},
  }: ApiExecutionContext
): Promise<SavedObject<T>> => {
  const {
    common: commonHelper,
    validation: validationHelper,
    encryption: encryptionHelper,
    preflight: preflightHelper,
    serializer: serializerHelper,
    migration: migrationHelper,
    user: userHelper,
  } = helpers;
  const { securityExtension } = extensions;

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  const {
    migrationVersion,
    coreMigrationVersion,
    typeMigrationVersion,
    managed,
    overwrite = false,
    references = [],
    refresh = DEFAULT_REFRESH_SETTING,
    initialNamespaces,
    version,
  } = options;
  const { migrationVersionCompatibility } = options;
  if (!allowedTypes.includes(type)) {
    throw SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
  }
  const id = commonHelper.getValidId(type, options.id, options.version, options.overwrite);
  validationHelper.validateInitialNamespaces(type, initialNamespaces);
  validationHelper.validateOriginId(type, options);

  const time = getCurrentTime();
  const createdBy = userHelper.getCurrentUserProfileUid();
  let savedObjectNamespace: string | undefined;
  let savedObjectNamespaces: string[] | undefined;
  let existingOriginId: string | undefined;
  const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);

  let preflightResult: PreflightCheckForCreateResult | undefined;
  if (registry.isSingleNamespace(type)) {
    savedObjectNamespace = initialNamespaces ? normalizeNamespace(initialNamespaces[0]) : namespace;
  } else if (registry.isMultiNamespace(type)) {
    if (options.id) {
      // we will overwrite a multi-namespace saved object if it exists; if that happens, ensure we preserve its included namespaces
      // note: this check throws an error if the object is found but does not exist in this namespace
      preflightResult = (
        await preflightHelper.preflightCheckForCreate([
          {
            type,
            id,
            overwrite,
            namespaces: initialNamespaces ?? [namespaceString],
          },
        ])
      )[0];
    }
    savedObjectNamespaces =
      initialNamespaces || getSavedObjectNamespaces(namespace, preflightResult?.existingDocument);
    existingOriginId = preflightResult?.existingDocument?._source?.originId;
  }

  const authorizationResult = await securityExtension?.authorizeCreate({
    namespace,
    object: {
      type,
      id,
      initialNamespaces,
      existingNamespaces: preflightResult?.existingDocument?._source?.namespaces ?? [],
    },
  });

  if (preflightResult?.error) {
    // This intentionally occurs _after_ the authZ enforcement (which may throw a 403 error earlier)
    throw SavedObjectsErrorHelpers.createConflictError(type, id);
  }

  // 1. If the originId has been *explicitly set* in the options (defined or undefined), respect that.
  // 2. Otherwise, preserve the originId of the existing object that is being overwritten, if any.
  const originId = Object.keys(options).includes('originId') ? options.originId : existingOriginId;
  const migrated = migrationHelper.migrateInputDocument({
    id,
    type,
    ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
    ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
    originId,
    attributes: await encryptionHelper.optionallyEncryptAttributes(
      type,
      id,
      savedObjectNamespace, // if single namespace type, this is the first in initialNamespaces. If multi-namespace type this is options.namespace/current namespace.
      attributes
    ),
    migrationVersion,
    coreMigrationVersion,
    typeMigrationVersion,
    managed: setManaged({ optionsManaged: managed }),
    created_at: time,
    updated_at: time,
    ...(createdBy && { created_by: createdBy }),
    ...(Array.isArray(references) && { references }),
  });

  /**
   * If a validation has been registered for this type, we run it against the migrated attributes.
   * This is an imperfect solution because malformed attributes could have already caused the
   * migration to fail, but it's the best we can do without devising a way to run validations
   * inside the migration algorithm itself.
   */
  validationHelper.validateObjectForCreate(type, migrated as SavedObjectSanitizedDoc<T>);

  const raw = serializer.savedObjectToRaw(migrated as SavedObjectSanitizedDoc<T>);

  const requestParams = {
    id: raw._id,
    index: commonHelper.getIndexForType(type),
    refresh,
    body: raw._source,
    ...(overwrite && version ? decodeRequestVersion(version) : {}),
    require_alias: true,
  };

  const { body, statusCode, headers } =
    id && overwrite
      ? await client.index(requestParams, { meta: true })
      : await client.create(requestParams, { meta: true });

  // throw if we can't verify a 404 response is from Elasticsearch
  if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(id, type);
  }

  return encryptionHelper.optionallyDecryptAndRedactSingleResult(
    serializerHelper.rawToSavedObject<T>({ ...raw, ...body }, { migrationVersionCompatibility }),
    authorizationResult?.typeMap,
    attributes
  );
};
