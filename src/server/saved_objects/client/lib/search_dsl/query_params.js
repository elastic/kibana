import { getRootProperties } from '../../../../mappings';

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
 *  @param  {Array<object>} extraFilters
 *  @return {Object}
 */
export function getQueryParams(mappings, type, search, searchFields, extraFilters) {
  if (!type && !search) {
    return {};
  }

  const bool = {};

  const filters = [];
  if (type) {
    filters.push({ term: { type } });
  }

  if (extraFilters) {
    filters.push(...extraFilters);
  }

  if (filters.length > 0) {
    bool.filter = filters;
  }

  if (search) {
    bool.must = [
      {
        simple_query_string: {
          query: search,
          ...getFieldsForTypes(
            searchFields,
            type ? [type] : Object.keys(getRootProperties(mappings))
          )
        }
      }
    ];
  }

  return { query: { bool } };
}
