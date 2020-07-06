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
import stripAnsi from 'strip-ansi';
import sinon from 'sinon';

import { watchStdioForLine } from '../watch_stdio_for_line';

describe('src/legacy/utils/watch_stdio_for_line', function () {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.reset());

  const onLogLine = sandbox.stub();
  const logFn = (line) => onLogLine(stripAnsi(line));

  it('calls logFn with log lines', async () => {
    const proc = execa(process.execPath, ['-e', 'console.log("hi")']);

    await watchStdioForLine(proc, logFn);

    // log output of the process
    sinon.assert.calledWithExactly(onLogLine, sinon.match(/hi/));
  });

  it('send the proc SIGKILL if it logs a line matching exitAfter regexp', async function () {
    // fixture proc will exit after 10 seconds if sigint not received, but the test won't fail
    // unless we see the log line `SIGINT not received`, so we let the test take up to 30 seconds
    // for potentially huge delays here and there
    this.timeout(30000);

    const proc = execa(process.execPath, [require.resolve('./fixtures/log_on_sigint')]);

    await watchStdioForLine(proc, logFn, /listening for SIGINT/);

    sinon.assert.calledWithExactly(onLogLine, sinon.match(/listening for SIGINT/));
    sinon.assert.neverCalledWith(onLogLine, sinon.match(/SIGINT not received/));
  });
});
