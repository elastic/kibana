/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isObject, once } from 'lodash';
import { mutate, BasicPrettyPrinter, Builder } from '@kbn/esql-ast';
import { Query, QueryPipeline, QueryRequest, Params } from './types';

export function createPipeline(source: Query): QueryPipeline {
  const flattenParams = (): Params[] => {
    return source.params.flatMap<Params>((param) =>
      isObject(param) ? Object.entries(param).map(([key, value]) => ({ [key]: value })) : param
    );
  };

  const buildQueryNode = once(() => {
    const { root, commands } = source;
    const rootCopy = Builder.expression.query([...root.commands]);
    for (const command of commands) {
      mutate.generic.commands.append(rootCopy, command);
    }
    return rootCopy;
  });

  const asRequest = (): QueryRequest => ({
    query: BasicPrettyPrinter.print(buildQueryNode(), { multiline: true }),
    params: flattenParams(),
  });

  const asString = (): string => {
    return BasicPrettyPrinter.print(buildQueryNode(), { multiline: true }, flattenParams());
  };

  const pipe = (...operators: Array<(query: Query) => Query>): QueryPipeline => {
    const nextSource = operators.reduce((q, op) => op(q), source);
    return createPipeline(nextSource);
  };

  return {
    pipe,
    asRequest,
    asString,
  };
}
