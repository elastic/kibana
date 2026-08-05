/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pLimit from 'p-limit';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ExpandWildcard, MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { QueryDslQueryContainer } from '../../../common/types';
import { convertEsError, isEsIndexNotFoundError } from './errors';
import { chunkIndicesForFieldCaps } from './chunk_indices_for_field_caps';
import { mergeFieldCapsResponses } from './merge_field_caps_responses';

// Elasticsearch always serializes `index` into the URL path for `_field_caps`, never the
// body or query string, so a data view whose pattern resolves to a very long index/pattern
// list can push the request line past Elasticsearch's `http.max_initial_line_length`
// (default 4096 bytes), throwing `too_long_http_line_exception`. Chunks that large lists
// are run with limited concurrency so we don't overwhelm the cluster with many parallel calls.
const FIELD_CAPS_CHUNK_CONCURRENCY = 10;

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
  runtimeMappings?: MappingRuntimeFields;
  abortSignal?: AbortSignal;
  projectRouting?: string;
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
    runtimeMappings,
    abortSignal,
    projectRouting,
  } = params;

  const fieldCapsRequest = async (indexTarget: string[] | string) => {
    try {
      return await callCluster.fieldCaps(
        {
          index: indexTarget,
          fields,
          ignore_unavailable: true,
          index_filter: indexFilter,
          expand_wildcards: expandWildcards,
          types: fieldTypes,
          include_empty_fields: includeEmptyFields ?? true,
          runtime_mappings: runtimeMappings,
          ...(projectRouting ? { project_routing: projectRouting } : {}),
          ...fieldCapsOptions,
        },
        { meta: true, signal: abortSignal }
      );
    } catch (error) {
      // return an empty set for closed indices
      if (
        error.message.startsWith('index_closed_exception') ||
        error.message.startsWith('cluster_block_exception')
      ) {
        return { body: { indices: [], fields: {} } };
      }
      throw error;
    }
  };

  const chunks = chunkIndicesForFieldCaps(indices);

  // The overwhelmingly common case (indices/pattern list already short enough for a
  // single request line): behave exactly as before, calling with the original `indices`.
  if (chunks.length <= 1) {
    try {
      return await fieldCapsRequest(indices);
    } catch (error) {
      throw convertEsError(indices, error);
    }
  }

  const limit = pLimit(FIELD_CAPS_CHUNK_CONCURRENCY);
  const chunkResults = await Promise.all(
    chunks.map((chunk) =>
      limit(async (): Promise<{ body: estypes.FieldCapsResponse } | { notFoundError: unknown }> => {
        try {
          const result = await fieldCapsRequest(chunk);
          return { body: result.body as estypes.FieldCapsResponse };
        } catch (error) {
          // A wildcard chunk matching nothing must not fail the whole request — only the
          // full pattern matching nothing (checked below) should, matching the single-call
          // `allow_no_indices: false` contract this function has always had.
          if (isEsIndexNotFoundError(error)) {
            return { notFoundError: error };
          }
          throw error;
        }
      })
    )
  );

  const matchedBodies = chunkResults
    .filter((result): result is { body: estypes.FieldCapsResponse } => !('notFoundError' in result))
    .map((result) => result.body);

  if (matchedBodies.length === 0) {
    const firstError = (chunkResults[0] as { notFoundError: unknown }).notFoundError;
    throw convertEsError(indices, firstError);
  }

  return { body: mergeFieldCapsResponses(matchedBodies) };
}
