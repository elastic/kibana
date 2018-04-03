import { getRootProperties } from '../../../../mappings';
import { convertExperimentalFilterToEsDsl } from './experimental_filter';

/**
 *  Get the field params based on the types and searchFields
 *  @param  {Array<string>} searchFields
 *  @param  {Array<string>} types
 *  @return {Object}
 */
function getFieldsForTypes(searchFields, types) {
  if (!searchFields || !searchFields.length) {
    return {
      all_fields: true
    };
  }

  return {
    fields: searchFields.reduce((acc, field) => [
      ...acc,
      ...types.map(prefix => `${prefix}.${field}`)
    ], []),
  };
}

/**
 *  Get the "query" related keys for the search body
 *  @param  {EsMapping} mapping mappings from Ui
 *  @param  {Object} type
 *  @param  {String} search
 *  @param  {Array<string>} searchFields
 *  @param  {Object} experimentalFilter
 *  @return {Object}
 */
export function getQueryParams(mappings, type, search, searchFields, experimentalFilter) {
  if (!type && !search && !experimentalFilter) {
    return {};
  }

  const bool = {};
  const savedObjectTypes = type ? [type] : Object.keys(getRootProperties(mappings));

  if (type) {
    bool.filter = [
      { term: { type } }
    ];
  }

  if (search) {
    bool.must = [
      {
        simple_query_string: {
          query: search,
          ...getFieldsForTypes(
            searchFields,
            savedObjectTypes
          )
        }
      }
    ];
  }

  if (experimentalFilter) {
    bool.must = (bool.must || []).concat(
      convertExperimentalFilterToEsDsl(savedObjectTypes, experimentalFilter)
    );
  }

  return { query: { bool } };
}
