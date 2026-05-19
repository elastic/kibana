import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { ESQLColumn, ESQLIdentifier } from '@elastic/esql/types';
import type { ESQLAstItem } from '@elastic/esql/types';
import type { ESQLUserDefinedColumn, ICommandContext } from '../../registry/types';
import type { SupportedDataType } from '../types';
export { getTrailingIdentifier } from './regex';
export declare const techPreviewLabel: string;
/**
 * In several cases we don't want to count the last arg if it is
 * of type unknown.
 *
 * this solves for the case where the user has typed a
 * prefix (e.g. "keywordField != tex/")
 *
 * "tex" is not a recognizable identifier so it is of
 * type "unknown" which leads us to continue suggesting
 * fields/functions.
 *
 * Monaco will then filter our suggestions list
 * based on the "tex" prefix which gives the correct UX
 */
export declare function removeFinalUnknownIdentiferArg(args: ESQLAstItem[], getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown'): ESQLAstItem[];
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
export declare function getOverlapRange(query: string, suggestionText: string): {
    start: number;
    end: number;
} | undefined;
export declare function pipePrecedesCurrentWord(text: string): boolean | undefined;
export declare function findPipeOutsideQuotes(text: string, start?: number): number;
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
export declare function getColumnByName(columnName: string, { columns }: ICommandContext): ESQLFieldWithMetadata | ESQLUserDefinedColumn | undefined;
/**
 * This function returns the userDefinedColumn or field matching a column
 */
export declare function getColumnForASTNode(node: ESQLColumn | ESQLIdentifier, { columns }: ICommandContext): ESQLFieldWithMetadata | ESQLUserDefinedColumn | undefined;
/**
 * Type guard to check if the type is 'param'
 */
export declare const isParamExpressionType: (type: string) => type is "param";
/** Counts commas at the top nesting level, respecting parens/brackets/braces/strings. */
export declare function countTopLevelCommas(text: string, start: number, end: number): number;
export declare function fuzzySearch(fuzzyName: string, resources: IterableIterator<string>): true | undefined;
