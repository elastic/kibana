/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { estypes } from '@elastic/elasticsearch';
import { isSupportedEsServer } from '@kbn/core-elasticsearch-server-internal';
import {
  GetFindRedactTypeMapParams,
  SavedObjectsErrorHelpers,
  SavedObjectsRawDoc,
  type CheckAuthorizationResult,
  type SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import { SearchParams } from '@kbn/core-saved-objects-api-server';
import deepMerge from 'deepmerge';
import { ApiExecutionContext } from '../types';

import { uniqNamespaces, getClauseForType } from '../../search/utils';

export interface PerformSearchParams {
  options: SearchParams;
}

/**
 * TODO(@jloleysens) support disabling extensions, test, comments
 * Adapted from existing performFind
 */
export const performSearch = async <
  T extends SavedObjectsRawDocSource = SavedObjectsRawDocSource,
  A = unknown
>(
  { options }: PerformSearchParams,
  {
    registry,
    helpers,
    serializer,
    allowedTypes: rawAllowedTypes,
    client,
    extensions = {},
  }: ApiExecutionContext
): Promise<estypes.SearchResponse<T, A>> => {
  const {
    common: commonHelper,
    migration: migrationHelper,
    serializer: serializerHelper,
    encryption: encryptionHelper,
  } = helpers;
  const { securityExtension, spacesExtension } = extensions;
  const { namespaces: requestedNamespaces, types, ...esOptions } = options;
  if (requestedNamespaces.length === 0)
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'options.namespaces cannot be an empty array'
    );

  if (!types.length) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'options.type must be a string or an array of strings'
    );
  }

  /**
   * TODO Revisit if this is the right approach
   * Maintains same behavior as SO where if a user includes an non existing or a "hidden" type they get an empty response back. We should rather fail fast.
   * Probably want behavior to be:
   *  1. remove concept of hidden types
   *  2. Only allow plugins to search types they registered
   *  3. Throw error if plugin tries to search a type it didn't register
   */
  const allowedTypes = types.filter((t) => rawAllowedTypes.includes(t));
  if (allowedTypes.length === 0) {
    return {
      hits: { hits: [] },
      took: 0,
      timed_out: false,
      _shards: { total: 0, successful: 0, failed: 0 },
    };
  }

  let namespaces: string[] = requestedNamespaces;
  if (spacesExtension) {
    try {
      namespaces = await spacesExtension.getSearchableNamespaces(requestedNamespaces);
    } catch (err) {
      if (Boom.isBoom(err) && err.output.payload.statusCode === 403) {
        // The user is not authorized to access any space, return an empty response.
        return {};
      }
      throw err;
    }
  }

  // We have to first perform an initial authorization check so that we can construct the search DSL accordingly
  const spacesToAuthorize = new Set(namespaces);
  const typesToAuthorize = new Set(types);
  let typeToNamespacesMap: Map<string, string[]> | undefined;
  let authorizationResult: CheckAuthorizationResult<string> | undefined;
  if (securityExtension) {
    authorizationResult = await securityExtension.authorizeFind({
      namespaces: spacesToAuthorize,
      types: typesToAuthorize,
    });
    if (authorizationResult?.status === 'unauthorized') {
      // If the user is unauthorized to find *anything* they requested, return an empty response
      return {};
    }
    if (authorizationResult?.status === 'partially_authorized') {
      typeToNamespacesMap = new Map<string, string[]>();
      for (const [objType, entry] of authorizationResult.typeMap) {
        if (!entry.find) continue;
        // This ensures that the query DSL can filter only for object types that the user is authorized to access for a given space
        const { authorizedSpaces, isGloballyAuthorized } = entry.find;
        typeToNamespacesMap.set(objType, isGloballyAuthorized ? namespaces : authorizedSpaces);
      }
    }
  }

  const namespaceBoolFilter = {
    bool: {
      filter: [
        {
          bool: {
            should: types.map((shouldType) => {
              const deduplicatedNamespaces = uniqNamespaces(
                typeToNamespacesMap ? typeToNamespacesMap.get(shouldType) : namespaces
              );
              return getClauseForType(registry, deduplicatedNamespaces, shouldType);
            }),
            minimum_should_match: 1,
          },
        },
      ],
    },
  };

  const query = deepMerge(esOptions.query ?? {}, namespaceBoolFilter, {
    // merge the filter array by putting our namespace filter first
    arrayMerge: (target, source) => source.concat(target),
  });

  const result = await client.search<T, A>(
    {
      ...esOptions,
      // If `pit` is provided, we drop the `index`, otherwise ES returns 400.
      index: esOptions.pit ? undefined : commonHelper.getIndicesForTypes(allowedTypes),
      query,
    },
    {
      ignore: [404],
      meta: true,
    }
  );
  if (result.statusCode === 404) {
    if (!isSupportedEsServer(result.headers)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
    }
    // 404 is only possible here if the index is missing, which
    // we don't want to leak, see "404s from missing index" above
    return {};
  }

  const redactTypeMapParams: GetFindRedactTypeMapParams = {
    previouslyCheckedNamespaces: spacesToAuthorize,
    objects: [],
  };
  for (const hit of result.body.hits.hits) {
    if (serializer.isRawSavedObject(hit as SavedObjectsRawDoc)) {
      redactTypeMapParams.objects.push({
        type: hit._source!.type,
        id: hit._id!,
        existingNamespaces: hit._source!.namespaces ?? [],
      });
    }
  }

  const redactTypeMap = redactTypeMapParams
    ? await securityExtension?.getFindRedactTypeMap(redactTypeMapParams)
    : undefined;

  // Migrations and encryption don't work on raw documents. To process them we have
  // to serialize raw documents to saved objects and then deserialize them back to
  // raw documents again.
  const processedHits: estypes.SearchHit<T>[] = [];
  for (const hit of result.body.hits.hits) {
    if (serializer.isRawSavedObject(hit as SavedObjectsRawDoc)) {
      const so = serializerHelper.rawToSavedObject(hit as SavedObjectsRawDoc);
      if (Boolean(options.fields?.length)) {
        // If the fields argument is set, don't migrate.
        // This document may only contains a subset of it's fields meaning the migration
        // (transform and forwardCompatibilitySchema) is not guaranteed to succeed. We
        // still try to decrypt/redact the fields that are present in the document.
        const decrypted = await encryptionHelper.optionallyDecryptAndRedactSingleResult(
          so,
          redactTypeMap
        );
        processedHits.push({
          ...hit,
          ...serializer.savedObjectToRaw(decrypted),
        } as estypes.SearchHit<T>);
      } else {
        const migratedSo = await migrationHelper.migrateAndDecryptStorageDocument({
          document: so,
          typeMap: redactTypeMap,
        });
        processedHits.push({
          ...hit,
          ...serializer.savedObjectToRaw(migratedSo),
        } as estypes.SearchHit<T>);
      }
    } else {
      processedHits.push(hit);
    }
  }

  result.body.hits.hits = processedHits;

  return result.body;
};
