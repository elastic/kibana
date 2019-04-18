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

import { isEqual } from 'lodash';
import expect from '@kbn/expect';

// expect.js's `eql` method provides nice error messages but sometimes misses things
// since it only tests loose (==) equality. This function uses lodash's `isEqual` as a
// second sanity check since it checks for strict equality.
export function expectDeepEqual(actual, expected) {
  expect(actual).to.eql(expected);
  expect(isEqual(actual, expected)).to.be(true);
}
