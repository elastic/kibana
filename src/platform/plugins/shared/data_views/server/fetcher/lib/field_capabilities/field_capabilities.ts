/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaults, keyBy } from 'lodash';

import type { ExpandWildcard, MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import { callFieldCapsApi } from '../es_api';
import { readFieldCapsResponse } from './field_caps_response';
import { mergeOverrides } from './overrides';
import type { FieldDescriptor } from '../../index_patterns_fetcher';
import type { QueryDslQueryContainer } from '../../../../common/types';
import { DATA_VIEWS_FIELDS_EXCLUDED_TIERS } from '../../../../common/constants';
import { getIndexFilterDsl } from '../../../utils';
import { processInChunks, sortByAsync } from '../async_processing_utils';

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
  runtimeMappings?: MappingRuntimeFields;
  abortSignal?: AbortSignal;
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
    runtimeMappings,
    abortSignal,
  } = params;

  performance.mark('getFieldCapabilities:start');
  const excludedTiers = await uiSettingsClient?.get<string>(DATA_VIEWS_FIELDS_EXCLUDED_TIERS);
  performance.mark('getFieldCapabilities:uiSettingsEnd');
  const esFieldCaps = await callFieldCapsApi({
    callCluster,
    indices,
    fieldCapsOptions,
    indexFilter: getIndexFilterDsl({ indexFilter, excludedTiers }),
    fields,
    expandWildcards,
    fieldTypes,
    includeEmptyFields,
    runtimeMappings,
    abortSignal,
  });
  performance.mark('getFieldCapabilities:responseEnd');
  const fieldCapsArr = readFieldCapsResponse(esFieldCaps.body);
  performance.mark('getFieldCapabilities:readEnd');

  const fieldsFromFieldCapsByName = keyBy(fieldCapsArr, 'name');

  // Extract field keys and filter out metadata fields
  const fieldKeys = Object.keys(fieldsFromFieldCapsByName).filter(
    (name) => !fieldsFromFieldCapsByName[name].metadata_field
  );

  // Combine with meta fields
  const allFieldNames = fieldKeys.concat(fieldCapsArr.length ? metaFields : []);

  // Deduplicate field names using a Map (efficient for large datasets)
  const uniqueNames: string[] = [];
  const seen = new Map<string, string>();
  for (const value of allFieldNames) {
    if (!seen.has(value)) {
      seen.set(value, value);
      uniqueNames.push(value);
    }
  }

  performance.mark('getFieldCapabilities:deduplicatedEnd');

  // Process field descriptors in chunks to avoid blocking the event loop
  // This allows other HTTP requests to be processed during long operations
  const allFieldsUnsorted = await processInChunks(
    uniqueNames,
    (name) => {
      const base = defaults({}, fieldsFromFieldCapsByName[name], {
        name,
        type: 'string',
        searchable: false,
        aggregatable: false,
        readFromDocValues: false,
        metadata_field: metaFields.includes(name),
      });
      return mergeOverrides(base);
    },
    1000 // Process 1000 fields at a time before yielding
  );

  performance.mark('getFieldCapabilities:allFieldsCollectedEnd');

  // add measures and print all measures
  performance.measure(
    'getFieldCapabilities:uiSettings',
    'getFieldCapabilities:start',
    'getFieldCapabilities:uiSettingsEnd'
  );
  performance.measure(
    'getFieldCapabilities:response',
    'getFieldCapabilities:uiSettingsEnd',
    'getFieldCapabilities:responseEnd'
  );
  performance.measure(
    'getFieldCapabilities:read',
    'getFieldCapabilities:responseEnd',
    'getFieldCapabilities:readEnd'
  );
  performance.measure(
    'getFieldCapabilities:deduplicated',
    'getFieldCapabilities:readEnd',
    'getFieldCapabilities:deduplicatedEnd'
  );
  performance.measure(
    'getFieldCapabilities:allFieldsCollected',
    'getFieldCapabilities:deduplicatedEnd',
    'getFieldCapabilities:allFieldsCollectedEnd'
  );

  // Sort fields asynchronously to avoid blocking for large field sets
  const sortedFields = await sortByAsync(allFieldsUnsorted, 'name');

  return {
    fields: sortedFields,
    indices: esFieldCaps.body.indices as string[],
  };
}
