/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { castArray } from 'lodash';
import Boom from '@hapi/boom';
import type { estypes } from '@elastic/elasticsearch';
import { isSupportedEsServer } from '@kbn/core-elasticsearch-server-internal';
import {
  type GetFindRedactTypeMapParams,
  SavedObjectsErrorHelpers,
  type SavedObjectsRawDoc,
} from '@kbn/core-saved-objects-server';
import type {
  SavedObjectsRawDocSource,
  SavedObjectsSearchOptions,
  SavedObjectsSearchResponse,
} from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
import { getNamespacesBoolFilter } from '../search';
import type { NamespacesBoolFilter } from '../search/search_dsl/query_params';
import { getRootFields } from '../utils';

export interface PerformSearchParams {
  options: SavedObjectsSearchOptions;
}

function createEmptySearchResponse<
  T extends SavedObjectsRawDocSource,
  A = unknown
>(): SavedObjectsSearchResponse<T, A> {
  return {
    hits: { hits: [] },
    took: 0,
    timed_out: false,
    _shards: { total: 0, successful: 0, failed: 0 },
  };
}

export async function performSearch<T extends SavedObjectsRawDocSource, A = unknown>(
  { options }: PerformSearchParams,
  { registry, helpers, serializer, allowedTypes, client, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsSearchResponse<T, A>> {
  const {
    common: commonHelper,
    encryption: encryptionHelper,
    migration: migrationHelper,
    serializer: serializerHelper,
  } = helpers;
  const { securityExtension, spacesExtension } = extensions;
  const { namespaces: requestedNamespaces, type, ...esOptions } = options;
  if (requestedNamespaces.length === 0)
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'options.namespaces cannot be an empty array'
    );

  if (!type.length) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'options.type must be a string or an array of strings'
    );
  }

  const rootFields = getRootFields();

  const forbiddenRuntimeMappings = Object.keys(esOptions.runtime_mappings ?? {}).filter((key) =>
    rootFields.includes(key)
  );
  if (forbiddenRuntimeMappings.length > 0) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      `'runtime_mappings' contains forbidden fields: ${forbiddenRuntimeMappings.join(', ')}`
    );
  }

  const types = castArray(type).filter((t) => allowedTypes.includes(t));
  if (types.length === 0) {
    return createEmptySearchResponse();
  }

  let namespaces: string[];
  try {
    namespaces =
      (await spacesExtension?.getSearchableNamespaces(requestedNamespaces)) ?? requestedNamespaces;
  } catch (error) {
    if (Boom.isBoom(error) && error.output.payload.statusCode === 403) {
      // The user is not authorized to access any space, return an empty response.
      return createEmptySearchResponse();
    }
    throw error;
  }
  if (namespaces.length === 0) {
    // The user is not authorized to access any of the requested spaces, return an empty response.
    return createEmptySearchResponse();
  }

  // We have to first perform an initial authorization check so that we can construct the search DSL accordingly
  const spacesToAuthorize = new Set(namespaces);
  const typesToAuthorize = new Set(types);
  const authorizationResult = await securityExtension?.authorizeFind({
    namespaces: spacesToAuthorize,
    types: typesToAuthorize,
  });
  if (authorizationResult?.status === 'unauthorized') {
    // If the user is unauthorized to find *anything* they requested, return an empty response
    return createEmptySearchResponse();
  }

  let typeToNamespacesMap: Map<string, string[]> | undefined;
  if (authorizationResult?.status === 'partially_authorized') {
    typeToNamespacesMap = new Map<string, string[]>();
    for (const [objType, entry] of authorizationResult.typeMap) {
      if (!entry.find) continue;
      // This ensures that the query DSL can filter only for object types that the user is authorized to access for a given space
      const { authorizedSpaces, isGloballyAuthorized } = entry.find;
      typeToNamespacesMap.set(objType, isGloballyAuthorized ? namespaces : authorizedSpaces);
    }
  }

  const query = mergeUserQueryWithNamespacesBool(
    esOptions.query,
    getNamespacesBoolFilter({ namespaces, registry, types, typeToNamespacesMap })
  );

  const result = await client.search<T, A>(
    {
      ...esOptions,
      // If `pit` is provided, we drop the `index`, otherwise ES returns 400.
      index: esOptions.pit ? undefined : commonHelper.getIndicesForTypes(types),
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
    return createEmptySearchResponse();
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
  const processHit = async (hit: estypes.SearchHit<T>): Promise<estypes.SearchHit<T>> => {
    if (!serializer.isRawSavedObject(hit as SavedObjectsRawDoc)) {
      return hit;
    }

    const savedObject = serializerHelper.rawToSavedObject(hit as SavedObjectsRawDoc);
    if (options.fields?.length) {
      // If the fields argument is set, don't migrate.
      // This document may only contains a subset of it's fields meaning the migration
      // (transform and forwardCompatibilitySchema) is not guaranteed to succeed. We
      // still try to decrypt/redact the fields that are present in the document.
      const decrypted = await encryptionHelper.optionallyDecryptAndRedactSingleResult(
        savedObject,
        redactTypeMap
      );

      return {
        ...hit,
        ...serializer.savedObjectToRaw(decrypted),
      } as estypes.SearchHit<T>;
    }

    const migratedSavedObject = await migrationHelper.migrateAndDecryptStorageDocument({
      document: savedObject,
      typeMap: redactTypeMap,
    });

    return {
      ...hit,
      ...serializer.savedObjectToRaw(migratedSavedObject),
    } as estypes.SearchHit<T>;
  };

  const processedHits: estypes.SearchHit<T>[] = [];
  for (const hit of result.body.hits.hits) {
    processedHits.push(await processHit(hit));
  }
  result.body.hits.hits = processedHits;

  return result.body;
}

export function mergeUserQueryWithNamespacesBool(
  userQuery: undefined | estypes.QueryDslQueryContainer,
  namespacesBoolFilter: NamespacesBoolFilter
): estypes.QueryDslQueryContainer {
  const must: estypes.QueryDslQueryContainer[] = [namespacesBoolFilter];
  if (userQuery) {
    must.push(userQuery);
  }
  return {
    bool: {
      must,
    },
  };
}
