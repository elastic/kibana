/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { QueryOperator } from '../types';
import { append } from './append';

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

type Sort = Record<string, SortOrder>;

export function sort(...sorts: Array<string | Sort | Array<string | Sort>>): QueryOperator {
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

  return append(
    `SORT ${allSorts
      .map((sortInstruction) => `${sortInstruction.column} ${sortInstruction.order}`)
      .join(', ')}`
  );
}
