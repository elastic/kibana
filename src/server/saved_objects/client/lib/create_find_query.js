import { get } from 'lodash';

/**
 *
 * @param search - the search string
 * @param searchFields - the fields to search on
 * @param type - the type to search on
 * @return {Array} Two simpleQueries in an array, one for v5, one for v6 (which has type appended).
 */
function createSimpleQueries(search, searchFields, type) {
  const v5SimpleQueryString = {
    query: search
  };
  const v6SimpleQueryString = {
    query: search
  };

  if (!searchFields) {
    v5SimpleQueryString.all_fields = true;
    v6SimpleQueryString.all_fields = true;
  } else if (Array.isArray(searchFields)) {
    v5SimpleQueryString.fields = searchFields;
    v6SimpleQueryString.fields = searchFields.map(field => `${type}.${field}`);
  } else {
    v5SimpleQueryString.fields = [searchFields];
    v6SimpleQueryString.fields = [`${type}.${searchFields}`];
  }

  return [v6SimpleQueryString, v5SimpleQueryString];
}

export function createFindQuery(mappings, options = {}) {
  const { type, search, searchFields, sortField, sortOrder } = options;

  if (!type && sortField) {
    throw new Error('Cannot sort without knowing the type');
  }

  if (!type && !search) {
    return { version: true, query: { match_all: {} } };
  }

  const bool = { must: [], should: [], filter: [] };

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
    bool.should.concat(createSimpleQueries(search, searchFields, type));
    bool.minimum_should_match = 1;
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
