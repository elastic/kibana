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

import { createSelectHandler } from './create_select_handler';

describe('createSelectHandler()', () => {
  let handleChange;
  let changeHandler;

  beforeEach(() => {
    handleChange = jest.fn();
    changeHandler = createSelectHandler(handleChange);
    const fn = changeHandler('test');
    fn([{ value: 'foo' }]);
  });

  test('calls handleChange() function with partial', () => {
    expect(handleChange.mock.calls.length).toEqual(1);
    expect(handleChange.mock.calls[0][0]).toEqual({
      test: 'foo',
    });
  });
});
