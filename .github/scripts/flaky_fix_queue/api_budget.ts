/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ApiBudget {
  rest: { limit: number; remaining: number; reset: number };
  graphql: { limit: number; remaining: number; reset: number };
}

const MIN_REST_REMAINING = 100;
const MIN_GRAPHQL_REMAINING = 100;

/** Leave headroom for other workflows and the complete admission sequence. */
export const hasApiBudget = ({ rest, graphql }: ApiBudget): boolean =>
  rest.remaining >= MIN_REST_REMAINING && graphql.remaining >= MIN_GRAPHQL_REMAINING;
