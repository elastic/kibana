import type { ESQLFunction } from '@elastic/esql/types';
import type { UnmappedFieldsStrategy } from '../../../registry/types';
import { type ESQLColumnData } from '../../../registry/types';
import type { FunctionDefinition, PromQLFunctionDefinition } from '../../types';
/**
 * Helper function to format a function signature in a readable format.
 * @param functionDef The function definition to format
 * @param fnNode ESQLFunction node to help determine the best matching signature
 * @param columns map of column data to help determine argument types
 * @param maxParamTypesToShow Maximum number of parameter types to show per parameter
 * @returns A formatted signature string
 *
 * @example output:
 * ```typescript
 *  count_distinct(
 *    field: boolean | date | date_nanos | double,
 *    precision?: integer | long | unsigned_long
 *  ): long
 * ```
 */
export declare function getFormattedFunctionSignature(functionDef: FunctionDefinition, fnNode?: ESQLFunction, columns?: Map<string, ESQLColumnData>, unmappedFieldsStrategy?: UnmappedFieldsStrategy, maxTypesToShow?: number): string;
export declare function getFormattedPromqlFunctionSignature(fnDef: PromQLFunctionDefinition): string;
