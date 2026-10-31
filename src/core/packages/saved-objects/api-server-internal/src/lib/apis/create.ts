/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeAclSource } from '@kbn/access-control';
import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import {
  SavedObjectsErrorHelpers,
  type SavedObject,
  type SavedObjectSanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { decodeRequestVersion } from '@kbn/core-saved-objects-base-server-internal';
import type {
  SavedObjectAccessControl,
  SavedObjectsCreateOptions,
} from '@kbn/core-saved-objects-api-server';
import type { CreateRequest } from '@elastic/elasticsearch/lib/api/types';
import { type IndexRequest } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_REFRESH_SETTING } from '../constants';
import type { PreflightCheckForCreateResult } from './internals/preflight_check_for_create';
import {
  getSavedObjectNamespaces,
  getCurrentTime,
  getExpectedVersionProperties,
  normalizeNamespace,
  setManaged,
} from './utils';
import type { ApiExecutionContext } from './types';
import { setAccessControl } from './utils/internal_utils';

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
    acl: aclHelper,
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
    initialAcl,
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
  const updatedBy = createdBy;
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

  const accessMode = options.accessControl?.accessMode;
  const typeSupportsAccessControl = registry.supportsAccessControl(type);
  let accessControlToWrite: SavedObjectAccessControl | undefined;
  if (securityExtension) {
    if (!typeSupportsAccessControl && accessMode) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        `Cannot create a saved object of type ${type} with an access mode because the type does not support access control`
      );
    }

    if (!createdBy && accessMode) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        `Cannot create a saved object of type ${type} with an access mode because Kibana could not determine the user profile ID for the caller. Access control requires an identifiable user profile`
      );
    }
    accessControlToWrite =
      preflightResult?.existingDocument?._source?.accessControl ??
      setAccessControl({
        typeSupportsAccessControl,
        createdBy,
        accessMode,
      });
  } else {
    // Overwrites keep the legacy access control even when the client skips the security extension.
    accessControlToWrite = preflightResult?.existingDocument?._source?.accessControl;
  }

  const authorizationResult = await securityExtension?.authorizeCreate({
    namespace,
    object: {
      type,
      id,
      initialNamespaces,
      existingNamespaces: preflightResult?.existingDocument?._source?.namespaces ?? [],
      accessControl: accessControlToWrite,
      name: SavedObjectsUtils.getName(registry.getNameAttribute(type), {
        attributes: {
          ...(preflightResult?.existingDocument?._source?.[type] ?? {}),
          ...attributes,
        },
      }),
    },
  });

  // An occupied ID the caller cannot view is reported as missing, with or without overwrite, and
  // overwriting a visible object needs edit. This runs before the conflict below, so the caller
  // learns only that a hidden ID is unavailable.
  const occupyingDocument =
    preflightResult?.existingDocument ?? preflightResult?.error?.conflictingDocument;
  if (occupyingDocument) {
    await aclHelper.enforce(overwrite ? 'edit' : 'view', namespace, {
      type,
      id,
      source: occupyingDocument._source,
    });
  }

  if (preflightResult?.error) {
    // This intentionally occurs _after_ the authZ enforcement (which may throw a 403 error earlier)
    throw SavedObjectsErrorHelpers.createConflictError(type, id);
  }

  // An overwrite always keeps the stored access, and only access changes can replace it.
  const existingAcl = normalizeAclSource(preflightResult?.existingDocument?._source);
  if (preflightResult?.existingDocument && initialAcl) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'Cannot set the initial access of an object that already exists'
    );
  }
  const aclToWrite = preflightResult?.existingDocument
    ? existingAcl
    : await aclHelper.getInitialAcl(type, namespace, initialAcl);

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
    ...(updatedBy && { updated_by: updatedBy }),
    ...(Array.isArray(references) && { references }),
    ...(accessControlToWrite && { accessControl: accessControlToWrite }),
    ...(aclToWrite && { acl: aclToWrite }),
  });

  /**
   * If a validation has been registered for this type, we run it against the migrated attributes.
   * This is an imperfect solution because malformed attributes could have already caused the
   * migration to fail, but it's the best we can do without devising a way to run validations
   * inside the migration algorithm itself.
   */
  validationHelper.validateObjectForCreate(type, migrated as SavedObjectSanitizedDoc<T>);

  const raw = serializer.savedObjectToRaw(migrated as SavedObjectSanitizedDoc<T>);

  // With object-level security, the write must hit the document that was authorized: an overwrite
  // is bound to it, and a create that found no document must not replace one created concurrently.
  const isAclEnforced = aclHelper.isEnforced(type);
  const existingDocument = preflightResult?.existingDocument;
  const requestParams: IndexRequest | CreateRequest = {
    id: raw._id,
    index: commonHelper.getIndexForType(type),
    refresh,
    document: raw._source,
    ...(overwrite && version
      ? decodeRequestVersion(version)
      : isAclEnforced && existingDocument
      ? getExpectedVersionProperties(undefined, existingDocument)
      : {}),
    require_alias: true,
  };

  const { body, statusCode, headers } =
    id && overwrite && (!isAclEnforced || existingDocument || version)
      ? await client.index(requestParams as IndexRequest, { meta: true })
      : await client.create(requestParams as CreateRequest, { meta: true });

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
