import { get } from 'lodash';

/**
 *
 * @param mappings
 * @param options
 * @property {Array|string} options.searchFields - Optional search fields, can be either a string, if searching on
 * only one field, or an array, if searching across many.
 * @property {string} options.search - optional search query
 * @property {string} options.type - optional type to limit the query to.
 * @property {string} options.sortField - optional field to sort on.
 * @property {string} options.sortOrder - optional direction to sort using.
 * @return {Object}
 */
export function createFindQuery(mappings, options = {}) {
  const { type, search, sortField, sortOrder } = options;

  if (!type && sortField) {
    throw new Error('Cannot sort without knowing the type');
  }

  if (!type && !search) {
    return { version: true, query: { match_all: {} } };
  }

  const bool = { must: [], filter: [] };

  if (type) {
    bool.filter.push({
      bool: {
        should: [
          {
            term: {
              _type: type
            }
          },
          {
            term: {
              type
            }
          }
        ]
      }
    });
  }

  if (search) {
    let searchFields = options.searchFields;
    // If options.searchFields is a singular string field, turn it into an array of one.
    searchFields = searchFields && !Array.isArray(searchFields) ? [searchFields] : searchFields;

    if (searchFields && type) {
      // Version 6 requires the type prefixed to the field name.
      const newArray = searchFields.map(field => `${type}.${field}`);
      searchFields = searchFields.concat(newArray);
    }

    const simpleQueryString = {
      query: search
    };

    if (searchFields) {
      simpleQueryString.fields = searchFields;
    } else {
      simpleQueryString.all_fields = true;
    }

    bool.must.push({ simple_query_string : simpleQueryString });
  } else {
    bool.must.push({
      match_all: {}
    });
  }

  const query = { version: true, query: { bool } };

  if (sortField) {
    const value = {
      order: sortOrder,
      unmapped_type: get(mappings, [type, 'properties', sortField, 'type'])
    };

    query.sort = [{
      [sortField]: value
    }, {
      [`${type}.${sortField}`]: value
    }];
  }

  return query;
}
