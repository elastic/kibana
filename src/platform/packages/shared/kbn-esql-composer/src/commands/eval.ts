/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Params } from '../types';
import { append } from '../pipeline/append';

/**
 * Appends an `EVAL` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param body The body of the `EVAL` command.
 * @param params The parameters to use in the `EVAL` command.
 * @returns A `QueryPipeline` instance with the `EVAL` command appended.
 */
export function evaluate<TQuery extends string, TParams extends Params<TQuery>>(
  body: TQuery,
  params?: TParams
) {
  return append({ command: `EVAL ${body}`, params });
}
