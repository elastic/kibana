export default function buildExistsFilter(field, indexPattern, negate = false) {
  return {
    exists: { field },
    meta: {
      negate,
      index: indexPattern.id
    }
  };
}
