/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors } from '@kbn/esql-ast';

/**
 * This function takes an ESQL query and returns whether the query has a keep clause.
 *
 * */
export function getESQLHasKeepClause(query: string) {
  const { ast } = getAstAndSyntaxErrors(query);
  return ast.some((clause) => clause.name === 'keep');
}
