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
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsEncryptionExtension } from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type {
  SavedObjectsEsqlOptions,
  SavedObjectsEsqlResponse,
} from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
import { getNamespacesBoolFilter } from '../search';

export interface PerformEsqlParams {
  options: SavedObjectsEsqlOptions;
  /** The raw Elasticsearch client, needed because RepositoryEsClient does not expose esql.query() */
  rawClient: ElasticsearchClient;
}

const EMPTY_ESQL_RESPONSE: SavedObjectsEsqlResponse = {
  columns: [],
  values: [],
};

const SOURCE_COMMAND_PATTERN = /^\s*(FROM|ROW|SHOW|METRICS)\b/i;

export async function performEsql(
  { options, rawClient }: PerformEsqlParams,
  { registry, helpers, allowedTypes, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsEsqlResponse> {
  const { securityExtension, spacesExtension } = extensions;
  const { namespaces: requestedNamespaces, type, pipeline, metadata, ...esqlOptions } = options;

  if (requestedNamespaces.length === 0) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'options.namespaces cannot be an empty array'
    );
  }

  if (SOURCE_COMMAND_PATTERN.test(pipeline)) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'options.pipeline must not start with a source command (FROM, ROW, SHOW, METRICS). ' +
        'The FROM clause is auto-generated from the type parameter.'
    );
  }

  const types = castArray(type).filter((t) => allowedTypes.includes(t));
  if (types.length === 0) {
    return EMPTY_ESQL_RESPONSE;
  }

  let namespaces: string[];
  try {
    namespaces =
      (await spacesExtension?.getSearchableNamespaces(requestedNamespaces)) ?? requestedNamespaces;
  } catch (error) {
    if (Boom.isBoom(error) && error.output.payload.statusCode === 403) {
      return EMPTY_ESQL_RESPONSE;
    }
    throw error;
  }
  if (namespaces.length === 0) {
    return EMPTY_ESQL_RESPONSE;
  }

  const spacesToAuthorize = new Set(namespaces);
  const typesToAuthorize = new Set(types);
  const authorizationResult = await securityExtension?.authorizeFind({
    namespaces: spacesToAuthorize,
    types: typesToAuthorize,
  });
  if (authorizationResult?.status === 'unauthorized') {
    return EMPTY_ESQL_RESPONSE;
  }

  let typeToNamespacesMap: Map<string, string[]> | undefined;
  if (authorizationResult?.status === 'partially_authorized') {
    typeToNamespacesMap = new Map<string, string[]>();
    for (const [objType, entry] of authorizationResult.typeMap) {
      if (!entry.find) continue;
      const { authorizedSpaces, isGloballyAuthorized } = entry.find;
      typeToNamespacesMap.set(objType, isGloballyAuthorized ? namespaces : authorizedSpaces);
    }
  }

  const namespacesBoolFilter = getNamespacesBoolFilter({
    namespaces,
    registry,
    types,
    typeToNamespacesMap,
  });

  const filter = mergeUserFilterWithNamespacesBool(esqlOptions.filter, namespacesBoolFilter);

  // Build the full ES|QL query: FROM <indices> [METADATA ...] <pipeline>
  const indices = helpers.common.getIndicesForTypes(types);
  let fromClause = `FROM ${indices.join(', ')}`;
  if (metadata && metadata.length > 0) {
    fromClause += ` METADATA ${metadata.join(', ')}`;
  }
  const query = `${fromClause} ${pipeline}`;

  const result = await rawClient.esql.query({
    ...esqlOptions,
    query,
    filter,
  });

  const { encryptionExtension } = extensions;
  return stripEncryptedColumns(result, types, encryptionExtension);
}

/**
 * Strips encrypted attribute values from ES|QL results by replacing them with null.
 * Column structure is preserved so row indices remain stable.
 *
 * ES|QL columns for saved object attributes use the pattern `<type>.<attribute_name>`.
 * If a type has encrypted attributes, any column matching `<type>.<encrypted_attr>` will
 * have its values replaced with null.
 */
function stripEncryptedColumns(
  response: SavedObjectsEsqlResponse,
  types: string[],
  encryptionExtension?: ISavedObjectsEncryptionExtension
): SavedObjectsEsqlResponse {
  if (!encryptionExtension) {
    return response;
  }

  // Collect encrypted attribute names per type (fast path: skip if no types are encryptable)
  const encryptedColumnPrefixes = new Map<string, ReadonlySet<string>>();
  for (const typeName of types) {
    if (!encryptionExtension.isEncryptableType(typeName)) {
      continue;
    }
    const attrs = encryptionExtension.getEncryptedAttributes(typeName);
    if (attrs && attrs.size > 0) {
      encryptedColumnPrefixes.set(typeName, attrs);
    }
  }

  if (encryptedColumnPrefixes.size === 0) {
    return response;
  }

  // Find column indices that correspond to encrypted attributes
  const encryptedColumnIndices = new Set<number>();
  for (let i = 0; i < response.columns.length; i++) {
    const columnName = response.columns[i].name;
    for (const [typeName, attrs] of encryptedColumnPrefixes) {
      for (const attrName of attrs) {
        if (columnName === `${typeName}.${attrName}`) {
          encryptedColumnIndices.add(i);
        }
      }
    }
  }

  if (encryptedColumnIndices.size === 0) {
    return response;
  }

  // Replace values in encrypted columns with null
  const strippedValues = response.values.map((row) =>
    row.map((value, colIdx) => (encryptedColumnIndices.has(colIdx) ? null : value))
  );

  return { ...response, values: strippedValues };
}

function mergeUserFilterWithNamespacesBool(
  userFilter: estypes.QueryDslQueryContainer | undefined,
  namespacesBoolFilter: estypes.QueryDslQueryContainer
): estypes.QueryDslQueryContainer {
  const must: estypes.QueryDslQueryContainer[] = [namespacesBoolFilter];
  if (userFilter) {
    must.push(userFilter);
  }
  return {
    bool: {
      must,
    },
  };
}
