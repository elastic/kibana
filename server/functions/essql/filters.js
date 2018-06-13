/*
 TODO: This could be pluggable
*/

export function time(filter) {
  if (!filter.column) throw new Error('column is required for Elasticsearch range filters');
  return {
    range: {
      [filter.column]: { gte: filter.from, lte: filter.to },
    },
  };
}

export function luceneQueryString(filter) {
  return {
    query_string: {
      query: filter.query || '*',
    },
  };
}

export function exactly(filter) {
  return {
    term: {
      [filter.column]: {
        value: filter.value,
      },
    },
  };
}
