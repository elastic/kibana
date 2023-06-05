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
import { isSupportedEsServer } from '@kbn/core-elasticsearch-server-internal';
import { DEFAULT_REFRESH_SETTING, DEFAULT_RETRY_COUNT } from '../constants';
import {
  getCurrentTime,
  getExpectedVersionProperties,
  getSavedObjectFromSource,
  isFoundGetResponse,
  rawDocExistsInNamespace,
} from './utils';
import { ApiExecutionContext } from './types';
import { PreflightCheckNamespacesResult } from './helpers';

export interface PerformUpdateParams<T = unknown> {
  type: string;
  id: string;
  attributes: T;
  options: SavedObjectsUpdateOptions<T>;
}

/**
 *
 * @param id: id of the ocument to be updated
 * @param type: SO type
 * @param attributes: SO attributes of the serialized document
 * @param options: Update options
 * @returns updated doc
 * @remarks To achieve BWC (support migration & modelVersions) we have to perform a `client-side` update.
 * Update achieved by fetching doc, make updates locally (in the repo) and send the new version of the doc to ES to index.
 * We had to change to a client-side update because `update` operations are effectively partial updates, restricting visibility into a SO as a whole.
 * @TODO: slowly refactor and move/update code as we work through the new flow:
  - Check type exists
  - MOVED FROM calling to fetch namespaces: Fetch doc (docs) before namespace check
  - Migrate docs to latest version docMigrator
        REAFCTOR: update remaining method code to work
  - Do checks for namespace stuff
        REAFCTOR: update remaining method code to work
  - Make changes/updates in the repo!
        REAFCTOR: update remaining method code to work
  - NEW: Check validity of new doc against schema (now supported because we have the whole document)
        REAFCTOR: update remaining method code to work
  - Post to ES for upsert (use index API for complete doc replacement.
 */
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
  // start of downward compatible update work
  const {
    version,
    references,
    upsert,
    refresh = DEFAULT_REFRESH_SETTING,
    retryOnConflict = version ? 0 : DEFAULT_RETRY_COUNT,
    migrationVersionCompatibility,
  } = options; // we only need this right now.

  if (!allowedTypes.includes(type)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }
  if (!id) {
    throw SavedObjectsErrorHelpers.createBadRequestError('id cannot be empty'); // prevent potentially upserting a saved object with an empty ID
  }
  // start of new flow for downward compat update get doc before namespace checks
  const {
    body: originalBody,
    statusCode,
    headers,
  } = await client.get<SavedObjectsRawDocSource>(
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
    !isFoundGetResponse(originalBody) ||
    indexNotFound ||
    !rawDocExistsInNamespace(registry, originalBody, namespace);

  if (objectNotFound) {
    // see "404s from missing index" above
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }
  const document = getSavedObjectFromSource<T>(registry, type, id, originalBody, {
    migrationVersionCompatibility,
  });
  let migratedDoc: SavedObject<T>;
  try {
    migratedDoc = migrationHelper.migrateStorageDocument(document) as SavedObject<T>;
  } catch (error) {
    throw SavedObjectsErrorHelpers.decorateGeneralError(
      error,
      'Failed to migrate document to the latest version.'
    );
  }
  // we now have the full document that is updated to the current version and can do the namespace checks using the id and type from that.
  // the document has namespaces that includes the original namespace converted from default.
  const docNamespaces = document.namespaces; // will be '*' if assigned to all, is multi-namespace type and shared to all
  const { id: docId, type: docType, attributes: docAttrib } = migratedDoc;

  // const {
  //   version,
  //   references,
  //   upsert,
  //   refresh = DEFAULT_REFRESH_SETTING,
  //   retryOnConflict = version ? 0 : DEFAULT_RETRY_COUNT,
  // } = options;

  // do internal namespaces check using the migrated doc we have
  // START
  let docPreflightResult: PreflightCheckNamespacesResult | undefined;
  if (registry.isMultiNamespace(docType))
    docPreflightResult = await preflightHelper.internalPreflightCheckNamespaces({
      type: docType,
      initialNamespaces: docNamespaces, // may not include namespace
      docExists: !!document,
    });

  // END
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
