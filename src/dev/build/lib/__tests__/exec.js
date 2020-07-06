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

import sinon from 'sinon';
import stripAnsi from 'strip-ansi';

import { ToolingLog } from '@kbn/dev-utils';
import { exec } from '../exec';

describe('dev/build/lib/exec', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.reset());

  const onLogLine = sandbox.stub();
  const log = new ToolingLog({
    level: 'verbose',
    writeTo: {
      write: (chunk) => {
        onLogLine(stripAnsi(chunk));
      },
    },
  });

  it('executes a command, logs the command, and logs the output', async () => {
    await exec(log, process.execPath, ['-e', 'console.log("hi")']);

    // logs the command before execution
    sinon.assert.calledWithExactly(onLogLine, sinon.match(`$ ${process.execPath}`));

    // log output of the process
    sinon.assert.calledWithExactly(onLogLine, sinon.match(/debg\s+hi/));
  });

  it('logs using level: option', async () => {
    await exec(log, process.execPath, ['-e', 'console.log("hi")'], {
      level: 'info',
    });

    // log output of the process
    sinon.assert.calledWithExactly(onLogLine, sinon.match(/info\s+hi/));
  });
});
