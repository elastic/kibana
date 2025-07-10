/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Params, QueryOperator } from '../types';
import { append } from '../append';

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

type Sort = Record<string, SortOrder>;

type SortArgs = Sort | string | Array<Sort | string>;

// TODO: a better name?
export function sortRaw<TQuery extends string, TParams extends Params<TQuery>>(
  body: TQuery,
  params?: TParams
): QueryOperator {
  return append({ command: `SORT ${body}`, params });
}

export function sort(...sorts: SortArgs[]): QueryOperator {
  const allSorts = sorts
    .flatMap((sortInstruction) => sortInstruction)
    .map((sortInstruction): { column: string; order: 'ASC' | 'DESC' } => {
      if (typeof sortInstruction === 'string') {
        return { column: sortInstruction, order: 'ASC' };
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
