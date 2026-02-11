/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Params, QueryOperator } from '../types';
import { append } from '../pipeline/append';

/**
 * @deprecated Migrate to `@kbn/esql-language` composer.
 */
export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

type Sort = Record<string, SortOrder>;

type SortArgs = Sort | string | Array<Sort | string>;

/**
 * Appends a `SORT` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param sorts The sort criteria.
 * @returns A `QueryPipeline` instance with the `SORT` command appended.
 */
export function sort<TQuery extends string, TParams extends Params<TQuery>>(
  body: TQuery,
  params?: TParams
): QueryOperator;
export function sort(...sorts: SortArgs[]): QueryOperator;
export function sort<TQuery extends string, TParams extends Params<TQuery>>(
  firstArg: TQuery | SortArgs,
  secondArg?: TParams | SortArgs,
  ...restSorts: SortArgs[]
): QueryOperator {
  if (typeof firstArg === 'string' && firstArg.includes('?')) {
    return append({ command: `SORT ${firstArg}`, params: secondArg as TParams });
  }

  const allSorts = [
    firstArg as SortArgs,
    ...(secondArg !== undefined ? [secondArg as SortArgs] : []),
    ...restSorts,
  ]
    .flatMap((sortInstruction) => sortInstruction)
    .map((sortInstruction): { column: string; order: SortOrder } => {
      if (typeof sortInstruction === 'string') {
        return { column: sortInstruction, order: SortOrder.Asc };
      }
      const column = Object.keys(sortInstruction)[0] as keyof typeof sortInstruction;

      return {
        column,
        order: sortInstruction[column],
      };
    });

  const command = `SORT ${allSorts
    .map((sortInstruction) => `${sortInstruction.column} ${sortInstruction.order}`)
    .join(', ')}`;

  return append({ command });
}
