export declare function collapseLiteralStrings(data: string): string;
/**
 * Takes in a string representing some JSON data and expands strings,
 * where needed, to a string literal representation.
 *
 * For example; given a value like: "{ "my_string": "\nhey!\n" }"
 *
 * Will return: "{ "my_string": """
 * hey!
 * """
 * }"
 */
export declare function expandLiteralStrings(data: string): string;
