export default function buildTermsFilter(field, values, indexPattern, negate = false) {
  return {
    query: {
      terms: {
        [field]: values
      }
    },
    meta: {
      negate,
      index: indexPattern.id
    }
  };
}
