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

import { RunWithCommands } from './run_with_commands';
import { ToolingLog, ToolingLogCollectingWriter } from '../tooling_log';
import { ProcRunner } from '../proc_runner';

const testLog = new ToolingLog();
const testLogWriter = new ToolingLogCollectingWriter();
testLog.setWriters([testLogWriter]);

const testCli = new RunWithCommands({
  usage: 'node scripts/test_cli [...options]',
  description: 'test cli',
  extendContext: async () => {
    return {
      extraContext: true,
    };
  },
  globalFlags: {
    boolean: ['some-bool'],
    help: `
      --some-bool         description
    `,
  },
});

beforeEach(() => {
  process.argv = ['node', 'scripts/test_cli', 'foo', '--some-bool'];
  jest.clearAllMocks();
});

it('extends the context using extendContext()', async () => {
  const context: any = await new Promise((resolve) => {
    testCli.command({ name: 'foo', description: 'some command', run: resolve }).execute();
  });

  expect(context).toEqual({
    log: expect.any(ToolingLog),
    flags: expect.any(Object),
    addCleanupTask: expect.any(Function),
    procRunner: expect.any(ProcRunner),
    extraContext: true,
  });

  expect(context.flags).toMatchInlineSnapshot(`
    Object {
      "_": Array [],
      "debug": false,
      "help": false,
      "quiet": false,
      "silent": false,
      "some-bool": true,
      "unexpected": Array [],
      "v": false,
      "verbose": false,
    }
  `);
});
