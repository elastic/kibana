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
import { PreflightCheckNamespacesResult } from './helpers';

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
  if (!allowedTypes.includes(type)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }
  if (!id) {
    throw SavedObjectsErrorHelpers.createBadRequestError('id cannot be empty'); // prevent potentially upserting a saved object with an empty ID
  }

  const {
    version,
    references,
    upsert,
    refresh = DEFAULT_REFRESH_SETTING,
    retryOnConflict = version ? 0 : DEFAULT_RETRY_COUNT,
  } = options;

  let preflightResult: PreflightCheckNamespacesResult | undefined;
  if (registry.isMultiNamespace(type)) {
    preflightResult = await preflightHelper.preflightCheckNamespaces({
      type,
      id,
      namespace,
    });
  }

  const existingNamespaces = preflightResult?.savedObjectNamespaces ?? [];

  const authorizationResult = await securityExtension?.authorizeUpdate({
    namespace,
    object: { type, id, existingNamespaces },
  });

  if (
    preflightResult?.checkResult === 'found_outside_namespace' ||
    (!upsert && preflightResult?.checkResult === 'not_found')
  ) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }
  if (upsert && preflightResult?.checkResult === 'not_found') {
    // If an upsert would result in the creation of a new object, we need to check for alias conflicts too.
    // This takes an extra round trip to Elasticsearch, but this won't happen often.
    // TODO: improve performance by combining these into a single preflight check
    await preflightHelper.preflightCheckForUpsertAliasConflict(type, id, namespace);
  }
  const time = getCurrentTime();

  let rawUpsert: SavedObjectsRawDoc | undefined;
  // don't include upsert if the object already exists; ES doesn't allow upsert in combination with version properties
  if (upsert && (!preflightResult || preflightResult.checkResult === 'not_found')) {
    let savedObjectNamespace: string | undefined;
    let savedObjectNamespaces: string[] | undefined;

    if (registry.isSingleNamespace(type) && namespace) {
      savedObjectNamespace = namespace;
    } else if (registry.isMultiNamespace(type)) {
      savedObjectNamespaces = preflightResult!.savedObjectNamespaces;
    }

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
    rawUpsert = serializer.savedObjectToRaw(migrated as SavedObjectSanitizedDoc);
  }

  const doc = {
    [type]: await encryptionHelper.optionallyEncryptAttributes(type, id, namespace, attributes),
    updated_at: time,
    ...(Array.isArray(references) && { references }),
  };

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
