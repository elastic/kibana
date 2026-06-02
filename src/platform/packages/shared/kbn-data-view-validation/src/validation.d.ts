import type { ValidationErrors } from './types';
/**
 * Validate index pattern strings
 * @public
 * @param indexPattern string to validate
 * @returns errors object
 */
export declare function validateDataView(indexPattern: string): ValidationErrors;
