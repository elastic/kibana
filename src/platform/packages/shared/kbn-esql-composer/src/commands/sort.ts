/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Params, QueryOperator, CommandOptions } from '../types';
import { append } from '../pipeline/append';

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

type Sort = Record<string, SortOrder>;

type SortArgs = Sort | string | Array<Sort | string>;

/**
 * Appends a `SORT` command to the ESQL composer pipeline.
 *
 * @param sorts The sort criteria.
 * @param options Optional configuration including comment.
 * @returns A `QueryPipeline` instance with the `SORT` command appended.
 */
export function sort<TQuery extends string, TParams extends Params<TQuery>>(
  body: TQuery,
  params?: TParams,
  options?: CommandOptions
): QueryOperator;
export function sort(...sorts: SortArgs[]): QueryOperator;
export function sort<TQuery extends string, TParams extends Params<TQuery>>(
  firstArg: TQuery | SortArgs,
  secondArg?: TParams | SortArgs | CommandOptions,
  ...restSorts: Array<SortArgs | CommandOptions>
): QueryOperator {
  if (typeof firstArg === 'string' && firstArg.includes('?')) {
    // Handle parameterized query with optional options
    const thirdArg = restSorts[0];
    const isOptions = thirdArg && typeof thirdArg === 'object' && !Array.isArray(thirdArg) && 'comment' in thirdArg;
    const options = isOptions ? (thirdArg as CommandOptions) : undefined;
    return append({ command: `SORT ${firstArg}`, params: secondArg as TParams, comment: options?.comment });
  }

  // Check if last argument is options object
  const allArgs = [firstArg as SortArgs, ...(secondArg !== undefined ? [secondArg as SortArgs] : []), ...restSorts];
  const lastArg = allArgs[allArgs.length - 1];
  const isOptions = typeof lastArg === 'object' && !Array.isArray(lastArg) && 'comment' in lastArg;
  
  const options = isOptions ? (lastArg as CommandOptions) : undefined;
  const sortArgs = isOptions ? allArgs.slice(0, -1) : allArgs;

  const allSorts = sortArgs
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

  return append({ command, comment: options?.comment });
}
