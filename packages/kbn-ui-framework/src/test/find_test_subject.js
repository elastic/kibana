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

/**
 * Find node which matches a specific test subject selector. Returns ReactWrappers around DOM element,
 * https://github.com/airbnb/enzyme/tree/master/docs/api/ReactWrapper.
 * Typically call simulate on ReactWrapper or call getDOMNode to get underlying DOM node.
 */
export const findTestSubject = (mountedComponent, testSubjectSelector) => {
  const testSubject = mountedComponent.find(`[data-test-subj="${testSubjectSelector}"]`);

  // restore enzyme 2 default find behavior of only returning ReactWrappers around DOM element
  // where as enzyme 3 returns both 1) ReactWrappers around DOM element and 2) react component.
  // https://github.com/airbnb/enzyme/issues/1174
  return testSubject.hostNodes();
};
