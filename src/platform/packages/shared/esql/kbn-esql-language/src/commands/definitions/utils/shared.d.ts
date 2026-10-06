/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { ESQLColumn, ESQLIdentifier } from '@elastic/esql/types';
import type { ESQLUserDefinedColumn, ICommandContext } from '../../registry/types';
export { getTrailingIdentifier } from './regex';
export declare const techPreviewLabel: string;
/**
 * Checks the suggestion text for overlap with the current query.
 *
 * This is useful to determine the range of the existing query that should be
 * replaced if the suggestion is accepted.
 *
 * For example
 * QUERY: FROM source | WHERE field IS NO
 * SUGGESTION: IS NOT NULL
 *
 * The overlap is "IS NO" and the range to replace is "IS NO" in the query.
 *
 * @param query
 * @param suggestionText
 * @returns
 */
export declare function getOverlapRange(
  query: string,
  suggestionText: string
):
  | {
      start: number;
      end: number;
    }
  | undefined;
export declare function pipePrecedesCurrentWord(text: string): boolean | undefined;
export declare function findPipeOutsideQuotes(text: string, start?: number): number;
export declare function getLastNonWhitespaceChar(text: string): string;
/**
 * Are we after a comma? i.e. STATS fieldA, <here>
 */
export declare function isRestartingExpression(text: string): boolean | undefined;
/**
 * Take a column name like "`my``column`"" and return "my`column"
 */
export declare function unescapeColumnName(columnName: string): string;
/**
 * This function returns the userDefinedColumn or field matching a column
 */
export declare function getColumnByName(
  columnName: string,
  { columns }: ICommandContext
): ESQLFieldWithMetadata | ESQLUserDefinedColumn | undefined;
/**
 * This function returns the userDefinedColumn or field matching a column
 */
export declare function getColumnForASTNode(
  node: ESQLColumn | ESQLIdentifier,
  { columns }: ICommandContext
): ESQLFieldWithMetadata | ESQLUserDefinedColumn | undefined;
/**
 * Type guard to check if the type is 'param'
 */
export declare const isParamExpressionType: (type: string) => type is 'param';
/** Counts commas at the top nesting level, respecting parens/brackets/braces/strings. */
export declare function countTopLevelCommas(text: string, start: number, end: number): number;
export declare function fuzzySearch(
  fuzzyName: string,
  resources: IterableIterator<string>
): true | undefined;
