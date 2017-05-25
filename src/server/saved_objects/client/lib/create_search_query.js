export function createSearchQuery(options = {}) {
  const { type, search, searchFields, ids } = options;

  if (ids) {
    return {
      ids: {
        type: type,
        values: ids
      }
    };
  }

  const bool = {
    must: [{
      match_all: {}
    }],
    filter: []
  };

  if (type) {
    bool.filter.push({
      term: {
        _type: type
      }
    });
  }

  if (search) {
    const queryString = {
      query: search
    };

    if (searchFields) {
      queryString.fields = searchFields;
    } else {
      queryString.all_fields = true;
    }

    bool.must.push({ simple_query_string: queryString });
  }

  return { bool };
}
