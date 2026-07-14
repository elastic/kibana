/**
 * Reads a given package.json file from disk and parses it
 * @param {string} path
 * @returns {import('./types').ParsedPackageJson | undefined}
 */
export function readPackageJson(path: string): import("./types").ParsedPackageJson | undefined;
/**
 * Asserts that given value looks like a parsed package.json file
 * @param {unknown} v
 * @returns {asserts v is import('./types').ParsedPackageJson}
 */
export function validateParsedPackageJson(v: unknown): asserts v is import("./types").ParsedPackageJson;
