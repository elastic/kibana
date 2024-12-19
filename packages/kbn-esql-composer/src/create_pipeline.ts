/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isObject } from 'lodash';
import { Query, QueryBuilderToOperator, QueryOperator, QueryPipeline } from './types';

function isQueryBuilderOperator(
  value: QueryOperator | QueryBuilderToOperator
): value is QueryBuilderToOperator {
  return (value as QueryBuilderToOperator).toQueryOperator !== undefined;
}

export function createPipeline(source: Query): QueryPipeline {
  return {
    pipe: (...operators) => {
      const nextSource = operators.reduce((previousQuery, operator) => {
        if (isQueryBuilderOperator(operator)) {
          return operator.toQueryOperator()(previousQuery);
        }

        return operator(previousQuery);
      }, source);

      return createPipeline(nextSource);
    },
    asString: () => {
      return source.commands.map((command) => command.body).join('\n\t| ');
    },
    getBindings: () => {
      return source.bindings.flatMap((binding) => {
        if (isObject(binding)) {
          return Object.entries(binding).map(([key, value]) => ({
            [key]: value,
          }));
        }
        if (Array.isArray(binding)) {
          return binding.map((p) => p);
        }

        return binding;
      });
    },
  };
}
