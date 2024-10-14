/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaults, keyBy, sortBy } from 'lodash';

import { ExpandWildcard } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import { callFieldCapsApi } from '../es_api';
import { readFieldCapsResponse } from './field_caps_response';
import { mergeOverrides } from './overrides';
import { FieldDescriptor } from '../../index_patterns_fetcher';
import { QueryDslQueryContainer } from '../../../../common/types';
import { DATA_VIEWS_FIELDS_EXCLUDED_TIERS } from '../../../../common/constants';
import { getIndexFilterDsl } from '../../../utils';

interface FieldCapabilitiesParams {
  callCluster: ElasticsearchClient;
  uiSettingsClient?: IUiSettingsClient;
  indices: string | string[];
  metaFields: string[];
  fieldCapsOptions?: { allow_no_indices: boolean; include_unmapped?: boolean };
  indexFilter?: QueryDslQueryContainer;
  fields?: string[];
  expandWildcards?: ExpandWildcard;
  fieldTypes?: string[];
  includeEmptyFields?: boolean;
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
    uiSettingsClient,
    indices = [],
    fieldCapsOptions,
    indexFilter,
    metaFields = [],
    fields,
    expandWildcards,
    fieldTypes,
    includeEmptyFields,
  } = params;

  const excludedTiers = await uiSettingsClient?.get<string>(DATA_VIEWS_FIELDS_EXCLUDED_TIERS);
  const esFieldCaps = await callFieldCapsApi({
    callCluster,
    indices,
    fieldCapsOptions,
    indexFilter: getIndexFilterDsl({ indexFilter, excludedTiers }),
    fields,
    expandWildcards,
    fieldTypes,
    includeEmptyFields,
  });
  const fieldCapsArr = readFieldCapsResponse(esFieldCaps.body);
  const fieldsFromFieldCapsByName = keyBy(fieldCapsArr, 'name');

  const allFieldsUnsorted = Object.keys(fieldsFromFieldCapsByName)
    // not all meta fields are provided, so remove and manually add
    .filter((name) => !fieldsFromFieldCapsByName[name].metadata_field)
    .concat(fieldCapsArr.length ? metaFields : []) // empty field lists should stay empty
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

  return {
    fields: sortBy(allFieldsUnsorted, 'name'),
    indices: esFieldCaps.body.indices as string[],
  };
}
