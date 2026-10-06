/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
/**
 * Check if the query contains any of the function names being passed in
 * @param query
 * @param functions list of function names to check for
 * @returns
 */
export declare const queryContainsFunction: (
  query:
    | AggregateQuery
    | Query
    | {
        [key: string]: any;
      }
    | undefined
    | null,
  functions: string[]
) => boolean;
/**
 * Check if the query contains any function that cannot be used after LIMIT clause
 * @param query
 * @returns
 */
export declare const queryCannotBeSampled: (
  query:
    | AggregateQuery
    | Query
    | {
        [key: string]: any;
      }
    | undefined
    | null
) => boolean;
