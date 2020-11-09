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

import execa from 'execa';

import { watchStdioForLine } from '../watch_stdio_for_line';

const onLogLine = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

it('calls logFn with log lines', async () => {
  const proc = execa(process.execPath, ['-e', 'console.log("hi")']);
  await watchStdioForLine(proc, onLogLine);
  expect(onLogLine.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "hi",
      ],
    ]
  `);
});

it('send the proc SIGKILL if it logs a line matching exitAfter regexp', async function () {
  const proc = execa(process.execPath, [require.resolve('../__fixtures__/log_on_sigint')]);
  await watchStdioForLine(proc, onLogLine, /listening for SIGINT/);
  expect(onLogLine.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "listening for SIGINT",
      ],
    ]
  `);
});
