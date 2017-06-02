export function buildExistsFilter(field, indexPattern) {
  return {
    meta: {
      index: indexPattern.id
    },
    exists: {
      field: field.name
    }
  };
}
