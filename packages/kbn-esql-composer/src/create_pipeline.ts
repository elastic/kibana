/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Query, QueryPipeline } from './types';

export function createPipeline(source: Query): QueryPipeline {
  return {
    pipe: (...operators) => {
      const nextSource = operators.reduce((previousQuery, operator) => {
        return operator(previousQuery);
      }, source);

      return createPipeline(nextSource);
    },
    asString: () => {
      return source.commands.map((command) => command.body).join('\n\t| ');
    },
  };
}
