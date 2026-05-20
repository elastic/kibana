import type { DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import type { ESQLControlVariable } from '@kbn/esql-types';
/**
 * Replaces columns in savedSearch with variable-driven columns when they exist in ESQL variables
 * and the original columns are not present in the current request.
 */
export declare const replaceColumnsWithVariableDriven: (savedSearchColumns: string[] | undefined, columnsMeta: Record<string, DatatableColumnMeta> | undefined, esqlVariables: ESQLControlVariable[] | undefined, isEsql: boolean) => string[];
