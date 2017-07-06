export function createFindQuery(options = {}) {
  const { type, search, searchFields, sort } = options;

  if (!type && sort) {
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

  if (sort) {
    const sortArray = Array.isArray(sort) ? sort : [sort];
    query.sort = sortArray.reduce((acc, item) => {
      acc.push(item);
      const transformed = Object.keys(item).reduce((itemAcc, key) => {
        itemAcc[`${type}.${key}`] = item[key];
        return itemAcc;
      }, {});
      acc.push(transformed);
      return acc;
    }, []);
  }

  return query;
}
