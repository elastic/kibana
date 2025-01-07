/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isSupportedEsServer } from '@kbn/core-elasticsearch-server-internal';
import {
  SavedObjectsErrorHelpers,
  type SavedObjectsRawDoc,
  CheckAuthorizationResult,
  SavedObjectsRawDocSource,
  GetFindRedactTypeMapParams,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';
import {
  DEFAULT_NAMESPACE_STRING,
  FIND_DEFAULT_PAGE,
  FIND_DEFAULT_PER_PAGE,
  SavedObjectsUtils,
} from '@kbn/core-saved-objects-utils-server';
import {
  SavedObjectsFindOptions,
  SavedObjectsFindInternalOptions,
  SavedObjectsFindResult,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import { ApiExecutionContext } from './types';
import {
  validateConvertFilterToKueryNode,
  getSearchDsl,
  validateAndConvertAggregations,
} from '../search';
import { includedFields } from '../utils';

export interface PerformFindParams {
  options: SavedObjectsFindOptions;
  internalOptions: SavedObjectsFindInternalOptions;
}

export const performFind = async <T = unknown, A = unknown>(
  { options, internalOptions }: PerformFindParams,
  {
    registry,
    helpers,
    allowedTypes: rawAllowedTypes,
    mappings,
    client,
    extensions = {},
  }: ApiExecutionContext
): Promise<SavedObjectsFindResponse<T, A>> => {
  const {
    common: commonHelper,
    serializer: serializerHelper,
    migration: migrationHelper,
    encryption: encryptionHelper,
  } = helpers;
  const { securityExtension, spacesExtension } = extensions;
  let namespaces!: string[];
  const { disableExtensions } = internalOptions;
  if (disableExtensions || !spacesExtension) {
    namespaces = options.namespaces ?? [DEFAULT_NAMESPACE_STRING];
    // If the consumer specified `namespaces: []`, throw a Bad Request error
    if (namespaces.length === 0)
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'options.namespaces cannot be an empty array'
      );
  }

  const {
    search,
    defaultSearchOperator = 'OR',
    searchFields,
    rootSearchFields,
    hasReference,
    hasReferenceOperator,
    hasNoReference,
    hasNoReferenceOperator,
    page = FIND_DEFAULT_PAGE,
    perPage = FIND_DEFAULT_PER_PAGE,
    pit,
    searchAfter,
    sortField,
    sortOrder,
    fields,
    type,
    filter,
    preference,
    aggs,
    migrationVersionCompatibility,
  } = options;

  if (!type) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'options.type must be a string or an array of strings'
    );
  } else if (preference?.length && pit) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'options.preference must be excluded when options.pit is used'
    );
  }

  const types = Array.isArray(type) ? type : [type];
  const allowedTypes = types.filter((t) => rawAllowedTypes.includes(t));
  if (allowedTypes.length === 0) {
    return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
  }

  if (searchFields && !Array.isArray(searchFields)) {
    throw SavedObjectsErrorHelpers.createBadRequestError('options.searchFields must be an array');
  }

  if (fields && !Array.isArray(fields)) {
    throw SavedObjectsErrorHelpers.createBadRequestError('options.fields must be an array');
  }

  let kueryNode;
  if (filter) {
    try {
      kueryNode = validateConvertFilterToKueryNode(allowedTypes, filter, mappings);
    } catch (e) {
      if (e.name === 'KQLSyntaxError') {
        throw SavedObjectsErrorHelpers.createBadRequestError(`KQLSyntaxError: ${e.message}`);
      } else {
        throw e;
      }
    }
  }

  let aggsObject;
  if (aggs) {
    try {
      aggsObject = validateAndConvertAggregations(allowedTypes, aggs, mappings);
    } catch (e) {
      throw SavedObjectsErrorHelpers.createBadRequestError(`Invalid aggregation: ${e.message}`);
    }
  }

  if (!disableExtensions && spacesExtension) {
    try {
      namespaces = await spacesExtension.getSearchableNamespaces(options.namespaces);
    } catch (err) {
      if (Boom.isBoom(err) && err.output.payload.statusCode === 403) {
        // The user is not authorized to access any space, return an empty response.
        return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
      }
      throw err;
    }
    if (namespaces.length === 0) {
      // The user is authorized to access *at least one space*, but not any of the spaces they requested; return an empty response.
      return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
    }
  }

  // We have to first perform an initial authorization check so that we can construct the search DSL accordingly
  const spacesToAuthorize = new Set(namespaces);
  const typesToAuthorize = new Set(types);
  let typeToNamespacesMap: Map<string, string[]> | undefined;
  let authorizationResult: CheckAuthorizationResult<string> | undefined;
  if (!disableExtensions && securityExtension) {
    authorizationResult = await securityExtension.authorizeFind({
      namespaces: spacesToAuthorize,
      types: typesToAuthorize,
    });
    if (authorizationResult?.status === 'unauthorized') {
      // If the user is unauthorized to find *anything* they requested, return an empty response
      return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
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

  const esOptions = {
    // If `pit` is provided, we drop the `index`, otherwise ES returns 400.
    index: pit ? undefined : commonHelper.getIndicesForTypes(allowedTypes),
    // If `searchAfter` is provided, we drop `from` as it will not be used for pagination.
    from: searchAfter ? undefined : perPage * (page - 1),
    _source: includedFields(allowedTypes, fields),
    preference,
    rest_total_hits_as_int: true,
    size: perPage,
    body: {
      size: perPage,
      seq_no_primary_term: true,
      from: perPage * (page - 1),
      _source: includedFields(allowedTypes, fields),
      ...(aggsObject ? { aggs: aggsObject } : {}),
      ...getSearchDsl(mappings, registry, {
        search,
        defaultSearchOperator,
        searchFields,
        pit,
        rootSearchFields,
        type: allowedTypes,
        searchAfter,
        sortField,
        sortOrder,
        namespaces,
        typeToNamespacesMap, // If defined, this takes precedence over the `type` and `namespaces` fields
        hasReference,
        hasReferenceOperator,
        hasNoReference,
        hasNoReferenceOperator,
        kueryNode,
      }),
    },
  };

  const { body, statusCode, headers } = await client.search<SavedObjectsRawDocSource>(esOptions, {
    ignore: [404],
    meta: true,
  });
  if (statusCode === 404) {
    if (!isSupportedEsServer(headers)) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
    }
    // 404 is only possible here if the index is missing, which
    // we don't want to leak, see "404s from missing index" above
    return SavedObjectsUtils.createEmptyFindResponse<T, A>(options);
  }

  // if extensions are enabled, we need to build an updated authorization type map
  // to pass on to the redact method
  const redactTypeMapParams: GetFindRedactTypeMapParams | undefined = disableExtensions
    ? undefined
    : {
        previouslyCheckedNamespaces: spacesToAuthorize,
        objects: [],
      };
  const savedObjects: SavedObjectsFindResult[] = [];

  body.hits.hits.forEach((hit: estypes.SearchHit<SavedObjectsRawDocSource>) => {
    const obj = serializerHelper.rawToSavedObject(hit as SavedObjectsRawDoc, {
      migrationVersionCompatibility,
    });

    if (redactTypeMapParams) {
      redactTypeMapParams.objects.push({
        type: obj.type,
        id: obj.id,
        existingNamespaces: obj.namespaces ?? [],
      });
    }

    savedObjects.push({
      ...obj,
      score: hit._score!,
      sort: hit.sort,
    });
  });

  const redactTypeMap = redactTypeMapParams
    ? await securityExtension?.getFindRedactTypeMap(redactTypeMapParams)
    : undefined;

  const migratedDocuments: Array<SavedObjectsFindResult<T>> = [];
  try {
    for (const savedObject of savedObjects) {
      let migrated: SavedObjectUnsanitizedDoc | undefined;
      const { sort, score, ...rawObject } = savedObject;

      if (fields !== undefined) {
        // If the fields argument is set, don't migrate.
        // This document may only contains a subset of it's fields meaning the migration
        // (transform and forwardCompatibilitySchema) is not guaranteed to succeed. We
        // still try to decrypt/redact the fields that are present in the document.
        migrated = await encryptionHelper.optionallyDecryptAndRedactSingleResult(
          savedObject,
          redactTypeMap
        );
      } else if (disableExtensions) {
        migrated = migrationHelper.migrateStorageDocument(rawObject);
      } else {
        migrated = await migrationHelper.migrateAndDecryptStorageDocument({
          document: rawObject,
          typeMap: redactTypeMap,
        });
      }

      migratedDocuments.push({ ...migrated, sort, score } as SavedObjectsFindResult<T>);
    }
  } catch (error) {
    throw SavedObjectsErrorHelpers.decorateGeneralError(
      error,
      'Failed to migrate document to the latest version.'
    );
  }

  const result: SavedObjectsFindResponse<T, A> = {
    ...(body.aggregations ? { aggregations: body.aggregations as unknown as A } : {}),
    page,
    per_page: perPage,
    total: body.hits.total as number,
    saved_objects: migratedDocuments,
    pit_id: body.pit_id,
  };

  return result;
};
