type StringValues = Array<{
    startIndex: number;
    endIndex: number;
}>;
interface ParseResult {
    stringValues: StringValues;
}
/**
 * Accepts JSON (as a string) and extracts the positions of all JSON string
 * values.
 *
 * For example:
 *
 * '{ "my_string_value": "is this", "my_number_value": 42 }'
 *
 * Would extract one result:
 *
 * [ { startIndex: 21, endIndex: 29 } ]
 *
 * This result maps to `"is this"` from the example JSON.
 *
 */
export declare const extractJSONStringValues: (input: string) => ParseResult;
export {};
