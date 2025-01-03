/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isObject } from 'lodash';
import { Query, QueryPipeline, QueryRequest, NamedParameter, Params } from './types';
import { escapeIdentifier, formatValue } from './utils/formatters';

export function createPipeline(source: Query): QueryPipeline {
  const asRequest = (): QueryRequest => {
    const params = source.params.flatMap<Params>((param) => {
      if (isObject(param)) {
        return Object.entries(param).map(([key, value]) => ({ [key]: value }));
      }
      if (Array.isArray(param)) {
        return param.map((p) => p);
      }
      return param;
    });

    return {
      query: source.commands.map((command) => command.body).join('\n\t| '),
      params,
    };
  };

  const asString = () => {
    const { query, params } = asRequest();

    let index = 0;
    return query.replace(/\?([a-zA-Z0-9_]+)?/g, (match, namedParam) => {
      if (index < params.length) {
        const value = params[index++];

        if (namedParam) {
          if (isObject(value)) {
            const paramValue = (value as NamedParameter)[namedParam];
            return isObject(paramValue) && 'identifier' in paramValue
              ? escapeIdentifier(paramValue.identifier)
              : formatValue(paramValue);
          }
        }

        return formatValue(value);
      }

      return match;
    });
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
