/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';
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
  fieldCapsOptions?: { allow_no_indices: boolean };
  filter?: QueryDslQueryContainer;
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
    filter,
    fieldCapsOptions = {
      allow_no_indices: false,
    },
  } = params;
  try {
    return await callCluster.fieldCaps(
      {
        index: indices,
        fields: '*',
        ignore_unavailable: true,
        index_filter: filter,
        ...fieldCapsOptions,
      },
      { meta: true }
    );
  } catch (error) {
    throw convertEsError(indices, error);
  }
}
