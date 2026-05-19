/**
 * Returns the virtual version associated with the given model version
 *
 * @example
 * ```
 * modelVersionToVirtualVersion(5); // "10.5.0";
 * modelVersionToVirtualVersion("3"); // "10.3.0";
 * ```
 */
export declare const modelVersionToVirtualVersion: (modelVersion: number | string) => string;
/**
 * Return true if the given semver version is a virtual model version.
 * Virtual model versions are version which major is the {@link modelVersionVirtualMajor}
 *
 * @example
 * ```
 * isVirtualModelVersion("10.3.0"); // true
 * isVirtualModelVersion("9.7.0);   // false
 * isVirtualModelVersion("10.3.1);  // false
 * ```
 */
export declare const isVirtualModelVersion: (version: string) => boolean;
/**
 * Converts a virtual model version to its model version.
 *
 *  @example
 *  ```
 *  virtualVersionToModelVersion('10.3.0'); // 3
 *  virtualVersionToModelVersion('9.3.0'); // throw
 *  ```
 */
export declare const virtualVersionToModelVersion: (virtualVersion: string) => number;
/**
 * Asserts the provided number or string is a valid model version, and returns it.
 *
 * A valid model version is a positive integer.
 *
 * @example
 * ```
 * assertValidModelVersion("7"); // 7
 * assertValidModelVersion(4); // 4
 * assertValidModelVersion("foo"); // throw
 * assertValidModelVersion("9.7"); // throw
 * assertValidModelVersion("-3"); // throw
 * ```
 */
export declare const assertValidModelVersion: (modelVersion: string | number) => number;
export declare const assertValidVirtualVersion: (virtualVersion: string) => string;
