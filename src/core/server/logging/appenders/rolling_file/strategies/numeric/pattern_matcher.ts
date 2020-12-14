/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { escapeRegExp } from 'lodash';

const createNumericMatcher = (fileBaseName: string, pattern: string): RegExp => {
  let extStart = fileBaseName.indexOf('.');
  if (extStart === -1) {
    extStart = fileBaseName.length;
  }
  const baseNameWithoutExt = escapeRegExp(fileBaseName.substr(0, extStart));
  const extension = escapeRegExp(fileBaseName.substr(extStart, fileBaseName.length));
  const processedPattern = escapeRegExp(pattern)
    // create matching group for `%i`
    .replace(/%i/g, '(?<counter>\\d+)');
  return new RegExp(`^${baseNameWithoutExt}${processedPattern}${extension}$`);
};

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
export const getFileNameMatcher = (logFileName: string, pattern: string) => {
  const matcher = createNumericMatcher(logFileName, pattern);
  return (fileName: string): number | undefined => {
    const match = matcher.exec(fileName);
    if (!match) {
      return undefined;
    }
    return parseInt(match.groups!.counter, 10);
  };
};

/**
 * Returns the rolling file name associated with given basename and pattern for given index.
 *
 * @example
 * ```ts
 *  getNumericFileName('foo.log', '.%i', 4) // -> `foo.4.log`
 *  getNumericFileName('kibana.log', '-{%i}', 12) // -> `kibana-{12}.log`
 * ```
 */
export const getRollingFileName = (
  fileBaseName: string,
  pattern: string,
  index: number
): string => {
  let suffixStart = fileBaseName.indexOf('.');
  if (suffixStart === -1) {
    suffixStart = fileBaseName.length;
  }
  const baseNameWithoutSuffix = fileBaseName.substr(0, suffixStart);
  const suffix = fileBaseName.substr(suffixStart, fileBaseName.length);
  const interpolatedPattern = pattern.replace('%i', String(index));
  return `${baseNameWithoutSuffix}${interpolatedPattern}${suffix}`;
};
