export function buildQueryFilter(query, index) {
  return {
    query: query,
    meta: {
      index: index
    }
  };
}
