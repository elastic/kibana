export function parseQuery(query) {
  let queryText = undefined;
  let visibleTypes = undefined;

  if (query) {
    if (query.ast.getTermClauses().length) {
      queryText = query.ast
        .getTermClauses()
        .map(clause => clause.value)
        .join(' ');
    }
    if (query.ast.getFieldClauses('type')) {
      visibleTypes = query.ast.getFieldClauses('type')[0].value;
    }
  }

  return {
    queryText,
    visibleTypes,
  };
}
