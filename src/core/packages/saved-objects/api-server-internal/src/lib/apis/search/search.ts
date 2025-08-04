/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { flow } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import { isSupportedEsServer } from '@kbn/core-elasticsearch-server-internal';
import {
  SavedObjectsErrorHelpers,
  type CheckAuthorizationResult,
  type SavedObjectsRawDocSource,
  type GetFindRedactTypeMapParams,
} from '@kbn/core-saved-objects-server';
import { SearchParams } from '@kbn/core-saved-objects-api-server';
import deepMerge from 'deepmerge';
import { ApiExecutionContext } from '../types';

import { uniqNamespaces, getClauseForType } from '../../search/utils';

export interface PerformSearchParams {
  options: SearchParams;
}

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
  const { common: commonHelper, migration: migrationHelper } = helpers;
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

  const allowedTypes = types.filter((t) => rawAllowedTypes.includes(t));
  if (allowedTypes.length === 0) {
    return {};
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

  const hasFieldsOption = Boolean(options.fields?.length);

  // This is a bit silly, maybe we can just return saved objects in `hits.hits`? But that is also a bit weird.
  const migrateStorageDocument = flow(
    serializer.rawToSavedObject,
    migrationHelper.migrateStorageDocument,
    serializer.savedObjectToRaw
  );

  const migratedHits = result.body.hits.hits.map((hit: estypes.SearchHit<T>) => {
    if (hit._source?.type && hit._id && !hasFieldsOption) {
      hit._source = migrateStorageDocument(hit._source);
    }
    return hit;
  });

  result.body.hits.hits = migratedHits;

  return result.body;
};
