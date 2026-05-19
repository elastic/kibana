export const PACKAGE_TYPES: Array<import("./types").KibanaPackageType>;
/**
 * @param {unknown} v
 * @returns {v is string}
 */
export function isSomeString(v: unknown): v is string;
/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
export function isObj(v: unknown): v is Record<string, unknown>;
/**
 * @param {unknown} v
 * @returns {v is string}
 */
export function isValidPluginId(v: unknown): v is string;
/**
 * @param {unknown} v
 * @returns {v is import('./types').KibanaPackageType}
 */
export function isValidPkgType(v: unknown): v is import("./types").KibanaPackageType;
/**
 * @param {unknown} v
 * @returns {v is string[]}
 */
export function isArrOfIds(v: unknown): v is string[];
/**
 * @param {unknown} v
 * @returns {v is string[]}
 */
export function isArrOfStrings(v: unknown): v is string[];
