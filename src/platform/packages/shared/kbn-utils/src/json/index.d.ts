/**
 * Synchronously reads and parses a JSON file at the given path.
 *
 * @param path Absolute path to the JSON file.
 */
export declare function loadJsonFile<T = unknown>(path: string): T;
/**
 * Given a JS object, will return a JSON.stringified result with consistently
 * sorted keys.
 */
export declare function prettyPrintAndSortKeys(object: object): string;
