/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression } from '@elastic/esql/types';
/**
 * Given a ES|QL query string, its AST and the cursor position,
 * it returns the type of context for the position ("list", "function", "option", "setting", "expression", "newCommand")
 * plus the whole hierarchy of nodes (command, option, setting and actual position node) context.
 *
 * Type details:
 * * "list": the cursor is inside a "in" list of values (i.e. `a in (1, 2, <here>)`)
 * * "function": the cursor is inside a function call (i.e. `fn(<here>)`)
 * * "expression": the cursor is inside a command expression (i.e. `command ... <here>` or `command a = ... <here>`)
 * * "newCommand": the cursor is at the beginning of a new command (i.e. `command1 | command2 | <here>`)
 */
export declare function getCursorContext(
  queryString: string,
  queryAst: ESQLAstQueryExpression,
  offset: number
):
  | {
      containingFunction?: undefined;
      option?: undefined;
      type: 'comment';
      isCursorInSubquery: boolean;
      queryContainsSubqueries: boolean;
      astForContext: ESQLAstQueryExpression;
      command?: undefined;
      node?: undefined;
    }
  | {
      type: 'newCommand';
      command: undefined;
      node: import('@elastic/esql-types').ESQLSingleAstItem | undefined;
      option: import('@elastic/esql-types').ESQLCommandOption | undefined;
      containingFunction:
        | import('@elastic/esql-types').ESQLFunction<
            import('@elastic/esql-types').FunctionSubtype,
            string
          >
        | undefined;
      isCursorInSubquery: boolean;
      queryContainsSubqueries: boolean;
      astForContext: ESQLAstQueryExpression;
    }
  | {
      type: 'expression';
      command:
        | import('@elastic/esql-types').ESQLAstHeaderCommand<
            string,
            import('@elastic/esql-types').ESQLSingleAstItem
          >
        | import('@elastic/esql-types').ESQLCommand<string>;
      containingFunction:
        | import('@elastic/esql-types').ESQLFunction<
            import('@elastic/esql-types').FunctionSubtype,
            string
          >
        | undefined;
      option: import('@elastic/esql-types').ESQLCommandOption | undefined;
      node: import('@elastic/esql-types').ESQLSingleAstItem | undefined;
      isCursorInSubquery: boolean;
      queryContainsSubqueries: boolean;
      astForContext: ESQLAstQueryExpression;
    };
