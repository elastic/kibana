/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { defaults, keyBy, sortBy } from 'lodash';

import { ElasticsearchClient } from 'kibana/server';
import { callFieldCapsApi } from '../es_api';
import { readFieldCapsResponse } from './field_caps_response';
import { mergeOverrides } from './overrides';
import { FieldDescriptor } from '../../index_patterns_fetcher';

/**
 *  Get the field capabilities for field in `indices`, excluding
 *  all internal/underscore-prefixed fields that are not in `metaFields`
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {Array}  [indices=[]]  the list of indexes to check
 *  @param  {Array}  [metaFields=[]] the list of internal fields to include
 *  @param  {Object} fieldCapsOptions
 *  @return {Promise<Array<FieldDescriptor>>}
 */
export async function getFieldCapabilities(
  callCluster: ElasticsearchClient,
  indices: string | string[] = [],
  metaFields: string[] = [],
  fieldCapsOptions?: { allow_no_indices: boolean }
) {
  const esFieldCaps = await callFieldCapsApi(callCluster, indices, fieldCapsOptions);
  const fieldsFromFieldCapsByName = keyBy(readFieldCapsResponse(esFieldCaps.body), 'name');

  const allFieldsUnsorted = Object.keys(fieldsFromFieldCapsByName)
    .filter((name) => !name.startsWith('_'))
    .concat(metaFields)
    .reduce<{ names: string[]; hash: Record<string, string> }>(
      (agg, value) => {
        // This is intentionally using a "hash" and a "push" to be highly optimized with very large indexes
        if (agg.hash[value] != null) {
          return agg;
        } else {
          agg.hash[value] = value;
          agg.names.push(value);
          return agg;
        }
      },
      { names: [], hash: {} }
    )
    .names.map<FieldDescriptor>((name) =>
      defaults({}, fieldsFromFieldCapsByName[name], {
        name,
        type: 'string',
        searchable: false,
        aggregatable: false,
        readFromDocValues: false,
      })
    )
    .map(mergeOverrides);

  return sortBy(allFieldsUnsorted, 'name');
}
