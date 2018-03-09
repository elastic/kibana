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
 *  Get the 'query' related keys for the search body
 *  @param  {EsMapping} mapping mappings from Ui
 *  @param  {Object} type
 *  @param  {String} search
 *  @param  {Array<string>} searchFields
 *  @param  {Array<string>} tags array of tag saved object id(s)
 *  @return {Object}
 */
export function getQueryParams(mappings, type, search, searchFields, tags) {
  if (!type && !search && !tags) {
    return {};
  }

  const filterList = [];
  if (type) {
    const typeFilter = { term: { type } };
    filterList.push(typeFilter);
  }
  if (tags) {
    const shouldList = tags.map(tagId => {
      return {
        term: {
          tags: tagId
        }
      };
    });
    const tagsFilter = {
      bool: {
        should: shouldList
      }
    };
    filterList.push(tagsFilter);
  }

  const bool = {};

  if (filterList.length > 0) {
    bool.filter = filterList;
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
