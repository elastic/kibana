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

const createNumericMatcher = (fileBaseName: string, pattern: string): RegExp => {
  let suffixStart = fileBaseName.indexOf('.');
  if (suffixStart === -1) {
    suffixStart = fileBaseName.length;
  }
  const baseNameWithoutSuffix = fileBaseName
    .substr(0, suffixStart)
    // escape special characters in the pattern
    .replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
  const suffix = fileBaseName
    .substr(suffixStart, fileBaseName.length)
    // escape special characters in the pattern
    .replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
  const processedPattern = pattern
    // escape special characters in the pattern
    .replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')
    // create matching group for `%i`
    .replace(/%i/g, '(?<counter>\\d+)');
  return new RegExp(`^${baseNameWithoutSuffix}${processedPattern}${suffix}$`);
};

export const getNumericMatcher = (logFileName: string, pattern: string) => {
  const matcher = createNumericMatcher(logFileName, pattern);
  return (fileName: string): number | undefined => {
    const match = matcher.exec(fileName);
    if (!match) {
      return undefined;
    }
    return parseInt(match.groups!.counter, 10);
  };
};

export const getNumericFileName = (
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
