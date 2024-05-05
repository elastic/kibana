/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface Command {
  body: string;
}

export interface QueryPipeline {
  pipe: (...args: QueryOperator[]) => QueryPipeline;
  asString: () => string;
}
export interface Query {
  commands: Command[];
}

export type QueryOperator = (sourceQuery: Query) => Query;
