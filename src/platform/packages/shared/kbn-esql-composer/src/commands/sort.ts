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
import { isCommandOptions, extractOptions } from '../utils/extract_options';

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

type Sort = Record<string, SortOrder>;

type SortArgs = Sort | string | Array<Sort | string>;

/**
 * Appends a `SORT` command to the ESQL composer pipeline.
 *
 * @param firstArg The parameterized query string or sort criteria.
 * @param secondArg Optional parameters, sort criteria, or options.
 * @param restArgs Additional sort criteria or options.
 * @returns A `QueryPipeline` instance with the `SORT` command appended.
 */
/**
 * Processes sort arguments into normalized sort instructions
 */
function processSortArgs(sortArgs: SortArgs[]): Array<{ column: string; order: SortOrder }> {
  return sortArgs
    .flatMap((sortInstruction): Array<string | Sort> => {
      if (Array.isArray(sortInstruction)) {
        return sortInstruction;
      }
      return [sortInstruction];
    })
    .map((sortInstruction): { column: string; order: SortOrder } => {
      if (typeof sortInstruction === 'string') {
        return { column: sortInstruction, order: SortOrder.Asc };
      }
      const column = Object.keys(sortInstruction)[0];
      if (!column) {
        throw new Error('Sort object must have at least one property');
      }

      return {
        column,
        order: sortInstruction[column],
      };
    });
}

/**
 * Generates a SORT command string from sort instructions
 */
function generateSortCommand(
  sortInstructions: Array<{ column: string; order: SortOrder }>
): string {
  return `SORT ${sortInstructions
    .map((sortInstruction) => `${sortInstruction.column} ${sortInstruction.order}`)
    .join(', ')}`;
}

export function sort(
  firstArg: string | SortArgs,
  secondArg?: Params | SortArgs | CommandOptions,
  ...restArgs: Array<SortArgs | CommandOptions>
): QueryOperator {
  // Handle parameterized query case
  if (typeof firstArg === 'string' && firstArg.includes('?')) {
    if (isCommandOptions(secondArg)) {
      throw new Error(
        'CommandOptions cannot be used as the second argument when first argument is a parameterized query string'
      );
    }
    const thirdArg = restArgs[0];
    const options = isCommandOptions(thirdArg) ? thirdArg : undefined;
    // When firstArg is a parameterized string, secondArg is the params object
    const params = secondArg as Params;
    return append({
      command: `SORT ${firstArg}`,
      params,
      comment: options?.comment,
    });
  }

  // Handle single sort with options case
  if (isCommandOptions(secondArg)) {
    const options = secondArg;
    const sortArgs = [firstArg];
    const allSorts = processSortArgs(sortArgs);
    const command = generateSortCommand(allSorts);
    return append({ command, comment: options?.comment });
  }

  // Handle variadic sort arguments case
  const allArgs = [firstArg, ...(secondArg !== undefined ? [secondArg] : []), ...restArgs];
  const { options, remaining: sortArgs } = extractOptions(allArgs);
  const allSorts = processSortArgs(sortArgs as SortArgs[]);
  const command = generateSortCommand(allSorts);
  return append({ command, comment: options?.comment });
}
