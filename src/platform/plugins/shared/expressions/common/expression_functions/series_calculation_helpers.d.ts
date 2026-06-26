/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable, DatatableRow } from '../expression_types';
/**
 * Returns a string identifying the group of a row by a list of columns to group by
 */
export declare function getBucketIdentifier(row: DatatableRow, groupColumns?: string[]): string;
/**
 * Checks whether input and output columns are defined properly
 * and builds column array of the output table if that's the case.
 *
 * * Throws an error if the output column exists already.
 * * Returns undefined if the input column doesn't exist.
 * @param input Input datatable
 * @param outputColumnId Id of the output column
 * @param inputColumnId Id of the input column
 * @param outputColumnName Optional name of the output column
 * @param options Optional options, set `allowColumnOverwrite` to true to not raise an exception if the output column exists already
 */
export declare function buildResultColumns(
  input: Datatable,
  outputColumnId: string,
  inputColumnId: string,
  outputColumnName: string | undefined,
  options?: {
    allowColumnOverwrite: boolean;
  }
): import('../expression_types').DatatableColumn[] | undefined;
