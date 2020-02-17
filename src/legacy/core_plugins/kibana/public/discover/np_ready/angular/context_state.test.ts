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

import { getState } from './context_state';

describe('Test Discover Context State', () => {
  test('getState function', () => {
    const state = getState('4', 'time', false);
    expect(state.appState.getState()).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "_source",
        ],
        "filters": Array [],
        "predecessorCount": 4,
        "sort": Array [
          "time",
          "desc",
        ],
        "successorCount": 4,
      }
    `);
    expect(state.globalState.getState()).toMatchInlineSnapshot(`null`);
    expect(state.startSync).toBeDefined();
    expect(state.stopSync).toBeDefined();
    expect(state.getFilters()).toStrictEqual([]);
  });
});
