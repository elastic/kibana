/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall } from '@kbn/connector-emulate';

/** An operation as the vendor API manifest records it. */
export interface MatchedOperation {
  readonly source?: string;
  /** Lowercase: an HTTP method, or for GraphQL the operation type (`query`, `mutation`). */
  readonly method: string;
  /** The path template, or for GraphQL the root field. */
  readonly path: string;
}

// The emulator names a GraphQL call by the operation type and root field it selects.
const GRAPHQL_OPERATION = /^(query|mutation) (\S+)$/;

/** Whether an operation is a GraphQL root field rather than an HTTP operation. */
export const isGraphQLOperation = ({ method }: Pick<MatchedOperation, 'method'>): boolean =>
  method === 'query' || method === 'mutation';

/**
 * The operation a call matched: an OpenAPI operation, or a GraphQL root field, whose operation
 * type stands in for the method and whose name for the path. Other named operations (MCP tools)
 * have none.
 */
export const matchedOperationOf = (
  matched: ContractCall['matched']
): MatchedOperation | undefined => {
  if (matched === undefined) {
    return undefined;
  }
  if ('method' in matched) {
    return { source: matched.source, method: matched.method, path: matched.path };
  }
  const [, type, field] = matched.name.match(GRAPHQL_OPERATION) ?? [];
  return type && field ? { source: matched.source, method: type, path: field } : undefined;
};
