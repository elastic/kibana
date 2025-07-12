/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mutate, BasicPrettyPrinter, Builder } from '@kbn/esql-ast';
import { Query, QueryPipeline, FieldValue } from './types';

export function createPipeline(source: Query): QueryPipeline {
  const getParametersMap = (): Record<string, FieldValue> => {
    const { params } = source;
    const parameterMap: Record<string, FieldValue> = {};

    const list = Array.isArray(params) ? params : [params];
    for (const param of list) {
      if (typeof param === 'object' && param !== null) {
        for (const [key, value] of Object.entries(param)) {
          parameterMap[key] = value as FieldValue;
        }
      } else {
        const index = Object.keys(parameterMap).length;
        parameterMap[String(index)] = param;
      }
    }

    return parameterMap;
  };

  const buildQueryNode = () => {
    const { root, commands } = source;
    const rootCopy = Builder.expression.query([...root.commands]);
    for (const command of commands) {
      mutate.generic.commands.append(rootCopy, command);
    }
    return rootCopy;
  };

  const asQuery = (): string => {
    return BasicPrettyPrinter.print(buildQueryNode(), {
      multiline: true,
      parameterSubstitutions: getParametersMap(),
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
