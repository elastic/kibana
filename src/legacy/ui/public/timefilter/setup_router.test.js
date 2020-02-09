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
import { registerTimefilterWithGlobalState } from './setup_router';

jest.mock('ui/utils/subscribe_with_scope', () => ({
  subscribeWithScope: jest.fn(),
}));

describe('registerTimefilterWithGlobalState()', () => {
  it('should always use iso8601 strings', async () => {
    const setTime = jest.fn();
    const timefilter = {
      setTime,
      setRefreshInterval: jest.fn(),
      getRefreshIntervalUpdate$: jest.fn(),
      getTimeUpdate$: jest.fn(),
    };

    const globalState = {
      time: {
        from: '2017-09-07T20:12:04.011Z',
        to: '2017-09-07T20:18:55.733Z',
      },
      on: (eventName, callback) => {
        callback();
      },
    };

    const rootScope = {
      $on: jest.fn(),
    };

    registerTimefilterWithGlobalState(timefilter, globalState, rootScope);

    expect(setTime.mock.calls.length).toBe(2);
    expect(setTime.mock.calls[1][0]).toEqual(globalState.time);
  });
});
