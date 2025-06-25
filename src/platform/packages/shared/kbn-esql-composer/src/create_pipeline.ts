/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isObject } from 'lodash';
import { mutate, BasicPrettyPrinter, Builder } from '@kbn/esql-ast';
import { Query, QueryPipeline, QueryRequest, Params } from './types';
import { formatValue, escapeColumn } from './utils/formatters';

export function createPipeline(source: Query): QueryPipeline {
  const asRequest = (): QueryRequest => {
    const params = source.params.flatMap<Params>((param) => {
      if (isObject(param)) {
        return Object.entries(param).map(([key, value]) => ({ [key]: value }));
      }

      return param;
    });

    const { root, commands } = source;
    const rootCopy = Builder.expression.query([...root.commands]);
    for (const command of commands) {
      mutate.generic.commands.append(rootCopy, command);
    }

    return {
      query: BasicPrettyPrinter.print(rootCopy, { multiline: true }),
      params,
    };
  };

  const asString = () => {
    const { query, params } = asRequest();

    let index = 0;
    return query.replace(
      /(\?{1,2})([a-zA-Z0-9_]+)?/g,
      (match, questionMarks: string, namedParam: string) => {
        if (index < params.length) {
          const value = params[index++];

          if (namedParam) {
            if (isObject(value)) {
              const paramValue = (value as any)[namedParam];
              return questionMarks.length > 1 ? escapeColumn(paramValue) : formatValue(paramValue);
            }
          }

          return formatValue(value);
        }

        return match;
      }
    );
  };

  return {
    pipe: (...operators) => {
      const nextSource = operators.reduce((previousQuery, operator) => {
        return operator(previousQuery);
      }, source);

      return createPipeline(nextSource);
    },
    asRequest,
    asString,
  };
}
