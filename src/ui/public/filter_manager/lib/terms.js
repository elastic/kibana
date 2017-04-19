export function buildTermsFilter(field, values, indexPattern) {
  const filter = { meta: { index: indexPattern.id } };

  if (field.scripted) {
    // TODO: Support scripted fields
  } else {
    filter.query = {
      terms: {
        [field.name]: values
      }
    };
  }

  return filter;
}
