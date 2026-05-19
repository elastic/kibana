import * as t from 'io-ts';
/**
 * Creates a schema that sets a default value if the input value is not specified.
 *
 * @param valueSchema Base schema of a value.
 * @param value Default value to set.
 * @param name (Optional) Name of the resulting schema.
 */
export declare const defaultValue: <TValue>(valueSchema: t.Type<TValue>, value: TValue, name?: string) => t.Type<TValue>;
