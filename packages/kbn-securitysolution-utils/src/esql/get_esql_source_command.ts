/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors } from '@kbn/esql-ast';

/**
 * This function takes an ESQL query and returns the source command that is being used in the query.
 * See below examples
 *
 * Ref : https://www.elastic.co/guide/en/elasticsearch/reference/current/esql-commands.html
 *
 * Example 1
 * ```javascript
 * const sourceCommand = getESQLSourceCommand('from some_index') // 'from'
 * ```
 * Example 2
 * ```javascript
 * const sourceCommand = getESQLSourceCommand('ROW col1="val1"') // 'row'
 * ```
 */
export function getESQLSourceCommand(query: string) {
  const { ast } = getAstAndSyntaxErrors(query);
  const commandClause = ast.find((clause) => clause.type === 'command');
  return commandClause && 'name' in commandClause ? commandClause.name : undefined;
}
