/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export declare const getFileNameMatcher: (
  logFileName: string,
  pattern: string
) => (fileName: string) => number | undefined;
/**
 * Returns the rolling file name associated with given basename and pattern for given index.
 *
 * @example
 * ```ts
 *  getNumericFileName('foo.log', '.%i', 4) // -> `foo.4.log`
 *  getNumericFileName('kibana.log', '-{%i}', 12) // -> `kibana-{12}.log`
 * ```
 */
export declare const getRollingFileName: (
  fileBaseName: string,
  pattern: string,
  index: number
) => string;
