/** Builds a `FROM` query for a view, quoting the name when the ES|QL lexer cannot read it unquoted. */
export declare const getViewEsqlQuery: (viewName: string) => string;
