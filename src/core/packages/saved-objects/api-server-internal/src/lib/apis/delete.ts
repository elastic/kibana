/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import type { SavedObjectsDeleteOptions } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { DEFAULT_REFRESH_SETTING } from '../constants';
import { deleteLegacyUrlAliases } from './internals/delete_legacy_url_aliases';
import { getExpectedVersionProperties } from './utils';
import type { PreflightAccessControlResult, PreflightCheckNamespacesResult } from './helpers';
import type { ApiExecutionContext } from './types';

export interface PerformDeleteParams<T = unknown> {
  type: string;
  id: string;
  options: SavedObjectsDeleteOptions;
}

const authorizeDelete = async ({
  type,
  id,
  namespace,
  preflightResult,
  context: { registry, extensions },
}: {
  type: string;
  id: string;
  namespace: string | undefined;
  preflightResult: PreflightCheckNamespacesResult | PreflightAccessControlResult;
  context: {
    registry: ISavedObjectTypeRegistry;
    extensions: any;
  };
}) => {
  const { securityExtension } = extensions;

  let name;
  let accessControl;
  const doc = preflightResult?.rawDocSource?._source;

  // Extract data from preflight result based on its type
  if ('savedObjectNamespaces' in preflightResult) {
    // This is a PreflightCheckNamespacesResult (multinamespace)
    accessControl = doc?.accessControl;
    if (securityExtension.includeSavedObjectNames()) {
      const saveObject = { attributes: doc?.[type] };
      name = SavedObjectsUtils.getName(registry.getNameAttribute(type), saveObject);
    }
  } else {
    // This is an access control preflight result (from accessControlPreflightCheck)
    accessControl = doc?.accessControl;
    if (securityExtension.includeSavedObjectNames()) {
      const saveObject = { attributes: doc?.[type] };
      name = SavedObjectsUtils.getName(registry.getNameAttribute(type), saveObject);
    }
  }

  await securityExtension?.authorizeDelete({
    namespace,
    object: { type, id, name, accessControl },
  });
};

export const performDelete = async <T>(
  { type, id, options }: PerformDeleteParams<T>,
  {
    registry,
    helpers,
    allowedTypes,
    client,
    serializer,
    extensions = {},
    logger,
    mappings,
  }: ApiExecutionContext
): Promise<{}> => {
  const { common: commonHelper, preflight: preflightHelper } = helpers;
  const { securityExtension } = extensions;
  const namespace = commonHelper.getCurrentNamespace(options.namespace);

  if (!allowedTypes.includes(type)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }

  const { refresh = DEFAULT_REFRESH_SETTING, force } = options;
  let preflightResult: PreflightCheckNamespacesResult | PreflightAccessControlResult | undefined;

  if (securityExtension) {
    if (registry.isMultiNamespace(type)) {
      preflightResult = await preflightHelper.preflightCheckNamespaces({
        type,
        id,
        namespace,
      });
    } else {
      const object = {
        type,
        id,
        namespaces: [SavedObjectsUtils.namespaceIdToString(namespace)],
      };
      preflightResult = await preflightHelper.accessControlPreflightCheck(object, namespace);
    }

    if (!preflightResult) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    await authorizeDelete({
      type,
      id,
      namespace,
      preflightResult,
      context: { registry, extensions },
    });
  }
  if (registry.isMultiNamespace(type)) {
    // Secondly we do multinamespace specific logic which might require doing the preflight again
    if (!preflightResult) {
      preflightResult = await preflightHelper.preflightCheckNamespaces({
        type,
        id,
        namespace,
      });
    }

    const multiNamespaceResult = preflightResult as PreflightCheckNamespacesResult;

    if (
      multiNamespaceResult.checkResult === 'found_outside_namespace' ||
      multiNamespaceResult.checkResult === 'not_found'
    ) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const existingNamespaces = multiNamespaceResult.savedObjectNamespaces ?? [];
    if (
      !force &&
      (existingNamespaces.length > 1 || existingNamespaces.includes(ALL_NAMESPACES_STRING))
    ) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'Unable to delete saved object that exists in multiple namespaces, use the `force` option to delete it anyway'
      );
    }
  }

  const rawId = serializer.generateRawId(namespace, type, id);

  const { body, statusCode, headers } = await client.delete(
    {
      id: rawId,
      index: commonHelper.getIndexForType(type),
      ...getExpectedVersionProperties(undefined),
      refresh,
    },
    { ignore: [404], meta: true }
  );

  if (isNotFoundFromUnsupportedServer({ statusCode, headers })) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(type, id);
  }

  const deleted = body.result === 'deleted';
  if (deleted) {
    const namespaces =
      preflightResult && 'savedObjectNamespaces' in preflightResult
        ? preflightResult?.savedObjectNamespaces
        : undefined;
    if (namespaces) {
      // This is a multi-namespace object type, and it might have legacy URL aliases that need to be deleted.
      await deleteLegacyUrlAliases({
        mappings,
        registry,
        client,
        getIndexForType: commonHelper.getIndexForType.bind(commonHelper),
        type,
        id,
        ...(namespaces.includes(ALL_NAMESPACES_STRING)
          ? { namespaces: [], deleteBehavior: 'exclusive' } // delete legacy URL aliases for this type/ID for all spaces
          : { namespaces, deleteBehavior: 'inclusive' }), // delete legacy URL aliases for this type/ID for these specific spaces
      }).catch((err) => {
        // The object has already been deleted, but we caught an error when attempting to delete aliases.
        // A consumer cannot attempt to delete the object again, so just log the error and swallow it.
        logger.error(`Unable to delete aliases when deleting an object: ${err.message}`);
      });
    }
    return {};
  }

  const deleteDocNotFound = body.result === 'not_found';
  // @ts-expect-error @elastic/elasticsearch doesn't declare error on DeleteResponse
  const deleteIndexNotFound = body.error && body.error.type === 'index_not_found_exception';
  if (deleteDocNotFound || deleteIndexNotFound) {
    // see "404s from missing index" above
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }

  throw new Error(
    `Unexpected Elasticsearch DELETE response: ${JSON.stringify({
      type,
      id,
      response: { body, statusCode },
    })}`
  );
};
