import * as t from 'io-ts';
/**
 * Creates a schema of an array that works in the following way:
 *   - If input is a CSV string, it will be parsed to an array which will be validated.
 *   - If input is an array, each item is validated to match `itemSchema`.
 *   - If input is a single string, it is validated to match `itemSchema`.
 *   - If input is not specified, the result will be set to [] (empty array):
 *     - null, undefined, empty string, empty array
 *
 * In all cases when an input is valid, the resulting decoded value will be an array,
 * either an empty one or containing valid items.
 *
 * @param itemSchema Schema of the array's items.
 * @param name (Optional) Name of the resulting schema.
 */
export declare const defaultCsvArray: <TItem>(itemSchema: t.Type<TItem>, name?: string) => t.Type<TItem[]>;
