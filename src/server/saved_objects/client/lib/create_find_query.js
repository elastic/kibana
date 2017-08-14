import { get } from 'lodash';

/**
 *
 * @param {string} search - a search string.
 * @param {Array?} searchFields - Optional array of search fields.
 * @return {Object} a simple query string object.
 */
function createSimpleQuery(search, searchFields) {
  const simpleQueryString = {
    query: search
  };

  if (!searchFields) {
    simpleQueryString.all_fields = true;
  } else {
    simpleQueryString.fields = searchFields;
  }

  return { simple_query_string : simpleQueryString };
}

/**
 * @param {Object} bool the bool query that we are going to add a search query too.
 * @param {string} search - the search string
 * @param {Array?} searchFields - Optional array of fields to search on
 * @param {string?} type - Optional type to search on
 */
function addSearchQuery(bool, search, searchFields, type) {
  if (!searchFields || !type) {
    bool.must = [createSimpleQuery(search, searchFields)];
  } else {
    const v5SimpleQueryString = createSimpleQuery(search, searchFields);
    const v6SimpleQueryString = createSimpleQuery(search, searchFields.map(field => `${type}.${field}`));

    bool.should = [v6SimpleQueryString, v5SimpleQueryString];
    bool.minimum_should_match = 1;
  }
}

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
  const { type, search, searchFields, sortField, sortOrder } = options;

  if (!type && sortField) {
    throw new Error('Cannot sort without knowing the type');
  }

  if (!type && !search) {
    return { version: true, query: { match_all: {} } };
  }

  const bool = { filter: [] };

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
    const searchFieldsArray = !searchFields || Array.isArray(searchFields) ? searchFields : [searchFields];
    addSearchQuery(bool, search, searchFieldsArray, type);
  } else {
    bool.must = [{
      match_all: {}
    }];
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
