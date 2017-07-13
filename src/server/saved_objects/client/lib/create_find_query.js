import { get } from 'lodash';
export function createFindQuery(mappings, options = {}) {
  const { type, search, searchFields, sortField, sortOrder } = options;

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
    const simpleQueryString = {
      query: search
    };

    if (!searchFields) {
      simpleQueryString.all_fields = true;
    } else if (Array.isArray(searchFields)) {
      simpleQueryString.fields = searchFields;
    } else {
      simpleQueryString.fields = [searchFields];
    }

    bool.must.push({ simple_query_string: simpleQueryString });
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
