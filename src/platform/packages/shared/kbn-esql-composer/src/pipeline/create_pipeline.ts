/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mutate, BasicPrettyPrinter, Builder, Walker } from '@kbn/esql-ast';
import { Query, QueryPipeline } from '../types';
import { ParameterReplacer } from '../transformers/parameter_replacer';

export function createPipeline(source: Query): QueryPipeline {
  const buildQueryAst = () => {
    const { root, commands } = source;
    const queryAst = Builder.expression.query([...root.commands]);
    for (const command of commands) {
      mutate.generic.commands.append(queryAst, command);
    }

    const replacer = new ParameterReplacer(source.params);
    Walker.walk(queryAst, {
      visitLiteral: (node) => {
        if (replacer.isReplaceable(node)) {
          Object.assign(node, replacer.replace(node));
        }
      },
      visitColumn: (node) => {
        if (replacer.isReplaceable(node)) {
          Object.assign(node, replacer.replace(node));
        }
      },
      visitFunction: (node) => {
        if (replacer.isReplaceable(node)) {
          Object.assign(node, replacer.replace(node));
        }
      },
    });

    return queryAst;
  };

  const asQuery = (): string => {
    return BasicPrettyPrinter.print(buildQueryAst(), {
      multiline: true,
    });
  };

  const pipe = (...operators: Array<(query: Query) => Query>): QueryPipeline => {
    const nextSource = operators.reduce((q, op) => op(q), source);
    return createPipeline(nextSource);
  };

  return {
    pipe,
    asQuery,
  };
}
