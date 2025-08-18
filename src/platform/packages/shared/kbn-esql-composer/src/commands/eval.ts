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

export function evaluate<TQuery extends string, TParams extends Params<TQuery>>(
  body: TQuery,
  params?: TParams
) {
  return append({ command: `EVAL ${body}`, params });
}
