/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type { SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import type { SavedObjectsDeleteOptions } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { DEFAULT_REFRESH_SETTING } from '../constants';
import { deleteLegacyUrlAliases } from './internals/delete_legacy_url_aliases';
import { getExpectedVersionProperties } from './utils';
import type { PreflightCheckNamespacesResult } from './helpers';
import type { ApiExecutionContext } from './types';

/**
 * Runs preflight (for multi-namespace types), performs authorization (if enabled),
 * and enforces the "force" rule for multi-space deletes.
 *
 * Returns the Preflight result for multi-namespace types, or undefined for single-namespace types.
 * Throws on "not found", "found outside namespace", or "force" violations.
 */
async function preflightAndAuthorizeDelete({
  type,
  id,
  namespace,
  force,
  context,
}: {
  type: string;
  id: string;
  namespace: string | undefined;
  force: boolean | undefined;
  context: Pick<
    ApiExecutionContext,
    'registry' | 'helpers' | 'extensions' | 'client' | 'serializer'
  > & {
    helpers: ApiExecutionContext['helpers'];
  };
}): Promise<PreflightCheckNamespacesResult | undefined> {
  const { registry, helpers, extensions, client, serializer } = context;
  const { common: commonHelper, preflight: preflightHelper } = helpers;
  const securityExtension = extensions?.securityExtension;

  // Multi-namespace types need preflight + optional auth using raw doc
  if (registry.isMultiNamespace(type)) {
    const preflightResult = await preflightHelper.preflightCheckNamespaces({
      type,
      id,
      namespace,
    });

    if (securityExtension) {
      const nameAttribute = registry.getNameAttribute(type);
      const accessControl = preflightResult.rawDocSource?._source?.accessControl;

      let name: string | undefined;
      if (securityExtension.includeSavedObjectNames()) {
        const saveObject = { attributes: preflightResult.rawDocSource?._source?.[type] };
        name = SavedObjectsUtils.getName(nameAttribute, saveObject);
      }

      await securityExtension.authorizeDelete({
        namespace,
        object: { type, id, name, accessControl },
      });
    }

    if (
      preflightResult.checkResult === 'found_outside_namespace' ||
      preflightResult.checkResult === 'not_found'
    ) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }

    const existingNamespaces = preflightResult.savedObjectNamespaces ?? [];
    const isAllSpaces = existingNamespaces.includes(ALL_NAMESPACES_STRING);
    const isMultiSpace = existingNamespaces.length > 1;

    if (!force && (isMultiSpace || isAllSpaces)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'Unable to delete saved object that exists in multiple namespaces, use the `force` option to delete it anyway'
      );
    }

    return preflightResult;
  }

  if (securityExtension) {
    const nameAttribute = registry.getNameAttribute(type);

    const resp = await client.get<SavedObjectsRawDocSource>(
      {
        index: commonHelper.getIndexForType(type),
        id: serializer.generateRawId(namespace, type, id),
        _source_includes: [
          ...SavedObjectsUtils.getIncludedNameFields(type, nameAttribute),
          'accessControl',
        ],
      },
      { ignore: [404], meta: true }
    );

    const accessControl = resp.body._source?.accessControl;

    let name: string | undefined;
    if (securityExtension.includeSavedObjectNames()) {
      const saveObject = { attributes: resp.body._source?.[type] };
      name = SavedObjectsUtils.getName(nameAttribute, saveObject);
    }

    await securityExtension.authorizeDelete({
      namespace,
      object: { type, id, name, accessControl },
    });
  }

  return undefined;
}

export interface PerformDeleteParams<T = unknown> {
  type: string;
  id: string;
  options: SavedObjectsDeleteOptions;
}

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
  const { common: commonHelper } = helpers;
  const namespace = commonHelper.getCurrentNamespace(options.namespace);

  if (!allowedTypes.includes(type)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }

  const { refresh = DEFAULT_REFRESH_SETTING, force } = options;

  const rawId = serializer.generateRawId(namespace, type, id);

  const preflightResult = await preflightAndAuthorizeDelete({
    type,
    id,
    namespace,
    force,
    context: { registry, helpers, extensions, client, serializer },
  });

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
    const namespaces = preflightResult?.savedObjectNamespaces;
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
