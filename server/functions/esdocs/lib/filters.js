/*
 TODO: This could be pluggable
*/

export function time(filter) {
  return {
    range: {
      [filter.column]: { gte: filter.from, lte: filter.to },
    },
  };
}

export function luceneQueryString(filter) {
  return {
    query_string: {
      query: filter.query,
    },
  };
}
