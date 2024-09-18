/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ExpandWildcard } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { QueryDslQueryContainer } from '../../../common/types';
import { convertEsError } from './errors';

/**
 *  Call the index.getAlias API for a list of indices.
 *
 *  If `indices` is an array or comma-separated list and some of the
 *  values don't match anything but others do this will return the
 *  matches and not throw an error.
 *
 *  If not a single index matches then a NoMatchingIndicesError will
 *  be thrown.
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {Array<String>|String} indices
 *  @return {Promise<IndexAliasResponse>}
 */
export async function callIndexAliasApi(
  callCluster: ElasticsearchClient,
  indices: string[] | string
) {
  try {
    return await callCluster.indices.getAlias({
      index: indices,
      ignore_unavailable: true,
      allow_no_indices: false,
    });
  } catch (error) {
    throw convertEsError(indices, error);
  }
}

interface FieldCapsApiParams {
  callCluster: ElasticsearchClient;
  indices: string[] | string;
  fieldCapsOptions?: { allow_no_indices: boolean; include_unmapped?: boolean };
  indexFilter?: QueryDslQueryContainer;
  fields?: string[];
  expandWildcards?: ExpandWildcard;
  fieldTypes?: string[];
  includeEmptyFields?: boolean;
}

/**
 *  Call the fieldCaps API for a list of indices.
 *
 *  Just like callIndexAliasApi(), callFieldCapsApi() throws
 *  if no indexes are matched, but will return potentially
 *  "partial" results if even a single index is matched.
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {Array<String>|String} indices
 *  @param  {Object} fieldCapsOptions
 *  @return {Promise<FieldCapsResponse>}
 */
export async function callFieldCapsApi(params: FieldCapsApiParams) {
  const {
    callCluster,
    indices,
    indexFilter,
    fieldCapsOptions = {
      allow_no_indices: false,
      include_unmapped: false,
    },
    fields = ['*'],
    expandWildcards,
    fieldTypes,
    includeEmptyFields,
  } = params;
  try {
    return await callCluster.fieldCaps(
      {
        index: indices,
        fields,
        ignore_unavailable: true,
        index_filter: indexFilter,
        expand_wildcards: expandWildcards,
        types: fieldTypes,
        include_empty_fields: includeEmptyFields ?? true,
        ...fieldCapsOptions,
      },
      { meta: true }
    );
  } catch (error) {
    // return an empty set for closed indices
    if (error.message.startsWith('cluster_block_exception')) {
      return { body: { indices: [], fields: {} } };
    }
    throw convertEsError(indices, error);
  }
}
