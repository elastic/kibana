export async function createFindQuery(filter, size) {
  const body = {
    size,
    query: {}
  };

  if (!filter) {
    body.query = { match_all: {} };
  } else {
    body.query = {
      query_string: {
        query: /^\w+$/.test(filter) ? `${filter}*` : filter,
        fields: ['title^3', 'description'],
        default_operator: 'AND'
      }
    };
  }

  return body;
}
