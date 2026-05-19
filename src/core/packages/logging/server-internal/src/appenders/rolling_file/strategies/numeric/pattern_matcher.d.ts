/**
 * Builds a matcher that can be used to match a filename against the rolling
 * file name pattern associated with given `logFileName` and `pattern`
 *
 * @example
 * ```ts
 * const matcher = getFileNameMatcher('kibana.log', '-%i');
 * matcher('kibana-1.log') // `1`
 * matcher('kibana-5.log') // `5`
 * matcher('kibana-A.log') // undefined
 * matcher('kibana.log')   // undefined
 * ```
 */
export declare const getFileNameMatcher: (logFileName: string, pattern: string) => (fileName: string) => number | undefined;
/**
 * Returns the rolling file name associated with given basename and pattern for given index.
 *
 * @example
 * ```ts
 *  getNumericFileName('foo.log', '.%i', 4) // -> `foo.4.log`
 *  getNumericFileName('kibana.log', '-{%i}', 12) // -> `kibana-{12}.log`
 * ```
 */
export declare const getRollingFileName: (fileBaseName: string, pattern: string, index: number) => string;
