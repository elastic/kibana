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
 *  @return {Object}
 */
export function getQueryParams(mappings, type, includeTypes, search, searchFields) {
  if (!type && !search) {
    if (includeTypes) {
      return {
        query: {
          bool: {
            should: includeTypes.map(includeType => ({
              term: {
                type: includeType,
              }
            }))
          }
        }
      };
    }

    return {};
  }

  const bool = {};

  if (type) {
    bool.filter = [
      { term: { type } }
    ];
  }

  if (includeTypes) {
    bool.should = includeTypes.map(includeType => ({
      term: {
        type: includeType,
      }
    }));
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
