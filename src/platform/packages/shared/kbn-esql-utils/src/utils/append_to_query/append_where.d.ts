import { type SupportedOperation } from './utils';
/**
 * Appends a WHERE clause to an existing ES|QL query string.
 * @param baseESQLQuery the base ES|QL query to append the WHERE clause to.
 * @param field the field to filter on.
 * @param value the value to filter by.
 * @param operation the operation to perform ('+', '-', 'is_not_null', 'is_null').
 * @param kibanaFieldType the type of the field being filtered (optional).
 * @param esMappingType the ES mapping type of the field (optional, used to determine whether to use MV_CONTAINS).
 * @returns the modified ES|QL query string with the appended WHERE clause, or undefined if no changes were made.
 */
export declare function appendWhereClauseToESQLQuery(baseESQLQuery: string, field: string, value: unknown, operation: SupportedOperation, kibanaFieldType?: string, esMappingType?: string): string | undefined;
