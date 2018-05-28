import { getRootPropertiesObjects } from '../../../../mappings';

/**
 * Gets the types based on the type. Uses mappings to support
 * null type (all types), a single type string or an array
 * @param {EsMapping} mappings
 * @param {(string|Array<string>)} type
 */
function getTypes(mappings, type) {
  if (!type) {
    return Object.keys(getRootPropertiesObjects(mappings));
  }

  if (Array.isArray(type)) {
    return type;
  }

  return [type];
}

/**
 *  Get the field params based on the types and searchFields
 *  @param  {Array<string>} searchFields
 *  @param  {string|Array<string>} types
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
 *  @param  {(string|Array<string>)} type
 *  @param  {String} search
 *  @param  {Array<string>} searchFields
 *  @return {Object}
 */
export function getQueryParams(mappings, type, search, searchFields) {
  if (!type && !search) {
    return {};
  }

  const bool = {};

  if (type) {
    bool.filter = [
      { [Array.isArray(type) ? 'terms' : 'term']: { type } }
    ];
  }

  if (search) {
    bool.must = [
      ...bool.must || [],
      {
        simple_query_string: {
          query: search,
          ...getFieldsForTypes(
            searchFields,
            getTypes(mappings, type)
          )
        }
      }
    ];
  }

  return { query: { bool } };
}
