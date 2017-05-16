export function createFindQuery(options = {}) {
  const { type, search, searchFields } = options;

  if (!type && !search) {
    return { version: true, query: { match_all: {} } };
  }

  const bool = { must: [], filter: [] };

  if (type) {
    bool.filter.push({
      term: {
        _type: type
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

  return { version: true, query: { bool } };
}
