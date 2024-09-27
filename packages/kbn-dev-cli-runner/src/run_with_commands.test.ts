/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { ProcRunner } from '@kbn/dev-proc-runner';
jest.mock('./metrics');

import { FlagsReader } from './flags_reader';
import { RunWithCommands } from './run_with_commands';

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
    flagsReader: expect.any(FlagsReader),
    addCleanupTask: expect.any(Function),
    procRunner: expect.any(ProcRunner),
    statsMeta: undefined,
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
