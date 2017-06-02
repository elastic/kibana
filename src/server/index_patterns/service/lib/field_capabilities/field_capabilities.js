import { defaults, indexBy, sortBy } from 'lodash';

import { callFieldCapsApi } from '../es_api';
import { readFieldCapsResponse } from './field_caps_response';
import { mergeOverrides } from './overrides';

export const concatIfUniq = (arr, value) => (
  arr.includes(value) ? arr : arr.concat(value)
);

/**
 *  Get the field capabilities for field in `indices`, excluding
 *  all internal/underscore-prefixed fields that are not in `metaFields`
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {Array}  [indices=[]]  the list of indexes to check
 *  @param  {Array}  [metaFields=[]] the list of internal fields to include
 *  @return {Promise<Array<FieldInfo>>}
 */
export async function getFieldCapabilities(callCluster, indices = [], metaFields = []) {
  const esFieldCaps = await callFieldCapsApi(callCluster, indices);
  const fieldsFromFieldCapsByName = indexBy(readFieldCapsResponse(esFieldCaps), 'name');

  const allFieldsUnsorted = Object
    .keys(fieldsFromFieldCapsByName)
    .filter(name => !name.startsWith('_'))
    .concat(metaFields)
    .reduce(concatIfUniq, [])
    .map(name => defaults({}, fieldsFromFieldCapsByName[name], {
      name,
      type: 'string',
      searchable: false,
      aggregatable: false,
      readFromDocValues: false
    }))
    .map(mergeOverrides);

  return sortBy(allFieldsUnsorted, 'name');
}
