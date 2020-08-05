/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { defaults, keyBy, sortBy } from 'lodash';

import { LegacyAPICaller } from 'kibana/server';
import { callFieldCapsApi } from '../es_api';
import { FieldCapsResponse, readFieldCapsResponse } from './field_caps_response';
import { mergeOverrides } from './overrides';
import { FieldDescriptor } from '../../index_patterns_fetcher';

export function concatIfUniq<T>(arr: T[], value: T) {
  return arr.includes(value) ? arr : arr.concat(value);
}

/**
 *  Get the field capabilities for field in `indices`, excluding
 *  all internal/underscore-prefixed fields that are not in `metaFields`
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {Array}  [indices=[]]  the list of indexes to check
 *  @param  {Array}  [metaFields=[]] the list of internal fields to include
 *  @return {Promise<Array<FieldDescriptor>>}
 */
export async function getFieldCapabilities(
  callCluster: LegacyAPICaller,
  indices: string | string[] = [],
  metaFields: string[] = []
) {
  const esFieldCaps: FieldCapsResponse = await callFieldCapsApi(callCluster, indices);
  const fieldsFromFieldCapsByName = keyBy(readFieldCapsResponse(esFieldCaps), 'name');

  const allFieldsUnsorted = Object.keys(fieldsFromFieldCapsByName)
    .filter((name) => !name.startsWith('_'))
    .concat(metaFields)
    .reduce(concatIfUniq, [] as string[])
    .map<FieldDescriptor>((name) =>
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
