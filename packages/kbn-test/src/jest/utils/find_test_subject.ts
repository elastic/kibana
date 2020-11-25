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

import { ReactWrapper } from 'enzyme';

type Matcher = '=' | '~=' | '|=' | '^=' | '$=' | '*=';

const MATCHERS: Matcher[] = [
  '=', // Exact match
  '~=', // Exists in a space-separated list
  '|=', // Begins with substring, followed by '-'
  '^=', // Begins with substring
  '$=', // Ends with substring
  '*=',
];

/**
 * Find node which matches a specific test subject selector. Returns ReactWrappers around DOM element,
 * https://github.com/airbnb/enzyme/tree/master/docs/api/ReactWrapper.
 * Common use cases include calling simulate or getDOMNode on the returned ReactWrapper.
 *
 * The ~= matcher looks for the value in space-separated list, allowing support for multiple data-test-subj
 * values on a single element. See https://www.w3.org/TR/selectors-3/#attribute-selectors for more
 * info on the other possible matchers.
 *
 * @param reactWrapper The React wrapper to search in
 * @param testSubjectSelector The data test subject selector
 * @param matcher optional matcher
 */
export const findTestSubject = <T = string>(
  reactWrapper: ReactWrapper,
  testSubjectSelector: T,
  matcher: Matcher = '~='
) => {
  if (!MATCHERS.includes(matcher)) {
    throw new Error(
      'Matcher '
        .concat(matcher, ' not found in list of allowed matchers: ')
        .concat(MATCHERS.join(' '))
    );
  }

  const testSubject = reactWrapper.find(`[data-test-subj${matcher}"${testSubjectSelector}"]`);
  // Restores Enzyme 2's find behavior, which was to only return ReactWrappers around DOM elements.
  // Enzyme 3 returns ReactWrappers around both DOM elements and React components.
  // https://github.com/airbnb/enzyme/issues/1174

  return testSubject.hostNodes();
};
