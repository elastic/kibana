import { get } from 'lodash';

function createSimpleQuery(search, searchFields) {
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

  return simpleQueryString;
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
    const v5SimpleQueryString = createSimpleQuery(search, searchFields);
    bool.should.push({ simple_query_string: v5SimpleQueryString });

    if (searchFields) {
      const v6SimpleQueryString = createSimpleQuery(search, searchFields.map(field => `${type}.${field}`));
      bool.should.push({ simple_query_string: v6SimpleQueryString });
    }
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
