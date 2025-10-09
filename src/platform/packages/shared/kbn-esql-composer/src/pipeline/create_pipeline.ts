/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '@kbn/esql-ast';
import type { Query, QueryPipeline, QueryRequest } from '../types';
import { buildQueryAst } from './build_query_ast';
import { replaceParameters } from './replace_parameters';

export function createPipeline(source: Query): QueryPipeline {
  const toString = (): string => {
    const ast = buildQueryAst(source);
    replaceParameters(ast, source.params);

    let queryString = BasicPrettyPrinter.print(ast, {
      multiline: true,
    });

    // Insert comments at appropriate positions
    if (source.comments) {
      const lines = queryString.split('\n');
      source.comments.forEach((comment) => {
        // Insert comment after the command at the specified position
        const insertIndex = Math.min(comment.position * 2 + 1, lines.length);
        lines.splice(insertIndex, 0, `  ${comment.text}`);
      });
      queryString = lines.join('\n');
    }

    return queryString;
  };

  const asRequest = (): QueryRequest => {
    const ast = buildQueryAst(source);
    return {
      query: BasicPrettyPrinter.print(ast, {
        multiline: true,
      }),
      params: source.params,
    };
  };

  const pipe = (...operators: Array<(query: Query) => Query>): QueryPipeline => {
    const nextSource = operators.reduce((q, op) => op(q), source);
    return createPipeline(nextSource);
  };

  return {
    pipe,
    toString,
    asRequest,
  };
}
