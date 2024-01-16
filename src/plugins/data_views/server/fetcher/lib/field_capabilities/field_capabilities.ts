/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaults, keyBy, sortBy, flow } from 'lodash';

import { ExpandWildcard } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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
  fieldCapsOptions?: { allow_no_indices: boolean; include_unmapped?: boolean };
  indexFilter?: QueryDslQueryContainer;
  fields?: string[];
  expandWildcards?: ExpandWildcard;
}

/**
 *  Get the field capabilities for field in `indices`, excluding
 *  all internal/underscore-prefixed fields that are not in `metaFields`
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {Array}  [indices=[]]  the list of indexes to check
 *  @param  {Array}  [metaFields=[]] the list of internal fields to include
 *  @param  {Object} fieldCapsOptions
 *  @return {Promise<{ fields: Array<FieldDescriptor>, indices: Array<string>>}>}
 */
export async function getFieldCapabilities(params: FieldCapabilitiesParams) {
  const {
    callCluster,
    indices = [],
    fieldCapsOptions,
    indexFilter,
    metaFields = [],
    fields,
    expandWildcards,
  } = params;
  const esFieldCaps = await callFieldCapsApi({
    callCluster,
    indices,
    fieldCapsOptions,
    indexFilter,
    fields,
    expandWildcards,
  });
  // a bunch of processing happens here but its rather complex
  const fieldCapsArr = readFieldCapsResponse(esFieldCaps.body);

  // another sorting

  const fieldsFromFieldCapsByName = keyBy(fieldCapsArr, 'name');

  const applyDefaults =
    (
      fldsFromFieldCapsByName: { [index: string]: FieldDescriptor },
      metaFlds: string[],
      checkMetafields: boolean = false
    ) =>
    (name: string) =>
      defaults({}, fldsFromFieldCapsByName[name], {
        name,
        type: 'string',
        searchable: false,
        aggregatable: false,
        readFromDocValues: false,
        metadata_field: checkMetafields && metaFlds.includes(name),
      });

  let isEmptyFieldset = true;

  // keys and reduce
  const allFieldsUnsorted = Object.keys(fieldsFromFieldCapsByName).reduce<FieldDescriptor[]>(
    (agg, field) => {
      // filtering step
      if (fieldsFromFieldCapsByName[field].metadata_field) {
        // filter out metaFields, added later
        // if (metaFields.includes(field))
        return agg;
      } else {
        // note that we have a non-metaField so we don't return an empty set
        isEmptyFieldset = false;
      }
      // transform step
      const fieldTransforms = flow(applyDefaults(fieldsFromFieldCapsByName, metaFields));
      agg.push(fieldTransforms(field));
      return agg;
    },
    []
  );

  // skip this if no non meta fields
  if (!isEmptyFieldset) {
    const metafieldsProcessed = metaFields.reduce<FieldDescriptor[]>((agg, field) => {
      const fieldTransforms = flow(
        applyDefaults(fieldsFromFieldCapsByName, metaFields, true),
        mergeOverrides
      );
      agg.push(fieldTransforms(field));
      return agg;
    }, []);

    allFieldsUnsorted.push(...metafieldsProcessed);
  }

  return {
    fields: isEmptyFieldset ? [] : sortBy(allFieldsUnsorted, 'name'),
    indices: esFieldCaps.body.indices as string[],
  };
}
