export function buildExistsFilter(field, indexPattern) {
  const filter = { meta: { index: indexPattern.id } };

  if (field.scripted) {
    // TODO: Support scripted fields
  } else {
    filter.exists = {
      field: field.name
    };
  }

  return filter;
}
