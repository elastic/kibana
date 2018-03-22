export function getQueryText(query) {
  return query && query.ast.getTermClauses().length
    ? query.ast
      .getTermClauses()
      .map(clause => clause.value)
      .join(' ')
    : '';
}
