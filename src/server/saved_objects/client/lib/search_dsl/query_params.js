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
 *  @param  {[type]} type         [description]
 *  @param  {[type]} search       [description]
 *  @param  {[type]} searchFields [description]
 *  @return {[type]}              [description]
 */
export function getQueryParams(mappings, type, search, searchFields) {
  if (!type && !search) {
    return {};
  }

  const bool = {};

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
            type
              ? [type]
              : getRootProperties(mappings).map(prop => prop.name)
          )
        }
      }
    ];
  }

  return { query: { bool } };
}
