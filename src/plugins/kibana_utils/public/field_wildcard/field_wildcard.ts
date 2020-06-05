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

import { escapeRegExp, memoize } from 'lodash';

export const makeRegEx = memoize(function makeRegEx(glob: string) {
  const globRegex = glob.split('*').map(escapeRegExp).join('.*');
  return new RegExp(`^${globRegex}$`);
});

// Note that this will return an essentially noop function if globs is undefined.
export function fieldWildcardMatcher(globs: string[] = [], metaFields: unknown[] = []) {
  return function matcher(val: unknown) {
    // do not test metaFields or keyword
    if (metaFields.indexOf(val) !== -1) {
      return false;
    }
    return globs.some((p) => makeRegEx(p).test(`${val}`));
  };
}

// Note that this will return an essentially noop function if globs is undefined.
export function fieldWildcardFilter(globs: string[] = [], metaFields: string[] = []) {
  const matcher = fieldWildcardMatcher(globs, metaFields);
  return function filter(val: unknown) {
    return !matcher(val);
  };
}
