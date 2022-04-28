/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaults, keyBy, sortBy } from 'lodash';

import { ElasticsearchClient } from '@kbn/core/server';
import { convertEsError } from '../errors';
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

async function callMappingApi(params: any) {
  const {
    callCluster,
    indices,
    fieldCapsOptions = {
      allow_no_indices: false,
    },
  } = params;
  try {
    return await callCluster.indices.getMapping(
      {
        index: indices,
        ...fieldCapsOptions,
      },
      { meta: true }
    );
  } catch (error) {
    throw convertEsError(indices, error);
  }
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

  console.log(indices);
  // get mapping to retrieve additional field information for TSDB/rollups
  const mappings = await callMappingApi({ callCluster, indices, fieldCapsOptions, filter });

  const parseMapping = (index: string, mapping: any, currentPath: string[] = []) => {
    Object.keys(mapping).forEach((fieldName) => {
      const path = [...currentPath, fieldName];
      const fullFieldName = path.join('.');

      if (mapping[fieldName].properties) {
        parseMapping(index, mapping[fieldName].properties, path);
      } else if (mapping[fieldName].type) {
        if (!fieldsFromFieldCapsByName[fullFieldName]) {
          return;
        }
        if (!fieldsFromFieldCapsByName[fullFieldName].indices) {
          fieldsFromFieldCapsByName[fullFieldName].indices = [];
        }
        const indexInfo: any = { name: index };
        if (mapping[fieldName].time_series_metric) {
          indexInfo.time_series_metric = mapping[fieldName].time_series_metric;
        }
        if (mapping[fieldName].time_series_dimension) {
          indexInfo.time_series_dimension = mapping[fieldName].time_series_dimension;
        }
        if (mapping[fieldName].metrics) {
          indexInfo.allowed_metrics = mapping[fieldName].metrics;
          indexInfo.default_metric = mapping[fieldName].default_metric;
        }
        if (mapping[fieldName].meta) {
          indexInfo.fixed_interval = mapping[fieldName].meta?.fixed_interval;
          indexInfo.time_zone = mapping[fieldName].meta?.time_zone;
        }
        fieldsFromFieldCapsByName[fullFieldName].indices!.push(indexInfo);
      }
    });
  };

  Object.keys(mappings.body).forEach((index) => {
    parseMapping(index, mappings.body[index].mappings.properties);
  });

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
