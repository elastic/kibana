/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaults, keyBy, sortBy } from 'lodash';

import { ElasticsearchClient } from '@kbn/core/server';
import { callFieldCapsApi } from '../es_api';
import { readFieldCapsResponse } from './field_caps_response';
import { mergeOverrides } from './overrides';
import { FieldDescriptor } from '../../index_patterns_fetcher';
import { QueryDslQueryContainer } from '../../../../common/types';

interface FieldCapabilitiesParams {
  callCluster: ElasticsearchClient;
  indices: string | string[];
  metaFields: string[];
  fieldCapsOptions?: { allow_no_indices: boolean };
  filter?: QueryDslQueryContainer;
}

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
export async function getFieldCapabilities(params: FieldCapabilitiesParams) {
  const { callCluster, indices = [], fieldCapsOptions, filter, metaFields = [] } = params;
  const esFieldCaps = await callFieldCapsApi({ callCluster, indices, fieldCapsOptions, filter });
  const fieldsFromFieldCapsByName = keyBy(readFieldCapsResponse(esFieldCaps.body), 'name');

  const allFieldsUnsorted = Object.keys(fieldsFromFieldCapsByName)
    // not all meta fields are provided, so remove and manually add
    .filter((name) => !fieldsFromFieldCapsByName[name].metadata_field)
    .concat(metaFields)
    .reduce<{ names: string[]; map: Map<string, string> }>(
      (agg, value) => {
        // This is intentionally using a Map to be highly optimized with very large indexes AND be safe for user provided data
        if (agg.map.get(value) != null) {
          return agg;
        } else {
          agg.map.set(value, value);
          agg.names.push(value);
          return agg;
        }
      },
      { names: [], map: new Map<string, string>() }
    )
    .names.map<FieldDescriptor>((name) =>
      defaults({}, fieldsFromFieldCapsByName[name], {
        name,
        type: 'string',
        searchable: false,
        aggregatable: false,
        readFromDocValues: false,
        metadata_field: metaFields.includes(name),
      })
    )
    .map(mergeOverrides);

  return sortBy(allFieldsUnsorted, 'name');
}
