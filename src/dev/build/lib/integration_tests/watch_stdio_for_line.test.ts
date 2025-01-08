/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
