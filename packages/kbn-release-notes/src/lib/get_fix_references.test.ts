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

import { getFixReferences } from './get_fix_references';

it('returns all fixed issue mentions in the PR text', () => {
  expect(
    getFixReferences(`
      clOses #1
      closes: #2
      clOse #3
      close: #4
      clOsed #5
      closed: #6
      fiX #7
      fix: #8
      fiXes #9
      fixes: #10
      fiXed #11
      fixed: #12
      reSolve #13
      resolve: #14
      reSolves #15
      resolves: #16
      reSolved #17
      resolved: #18
      fixed
      #19
    `)
  ).toMatchInlineSnapshot(`
    Array [
      "#1",
      "#2",
      "#3",
      "#4",
      "#5",
      "#6",
      "#7",
      "#8",
      "#9",
      "#10",
      "#11",
      "#12",
      "#13",
      "#14",
      "#15",
      "#16",
      "#17",
      "#18",
    ]
  `);
});
