/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ESQLCommandOption, getAstAndSyntaxErrors } from '@kbn/esql-ast';

/**
 * Takes an ESQL query and returns the metadata columns if present.
 *
 * Example 1
 * ```javascript
 * const metadataFields = getESQLMetadataFields(`from some_index metadata _id, _index`) // ['_id', '_index']
 * ```
 */
export function getESQLMetadataFields(query: string) {
  const { ast } = getAstAndSyntaxErrors(query);
  const fromClause = ast.find((clause) => clause.name === 'from');
  const metadataClause = fromClause?.args.find((arg) => 'name' in arg && arg.name === 'metadata');
  const metadataColumns =
    (metadataClause as ESQLCommandOption | undefined)?.args.map((arg) =>
      'name' in arg ? arg.name : ''
    ) || [];
  return metadataColumns;
}
