/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { createStripAnsiSerializer, createRecursiveSerializer } from '@kbn/jest-serializers';

import { exec } from './exec';

const testWriter = new ToolingLogCollectingWriter();
const log = new ToolingLog();
log.setWriters([testWriter]);

expect.addSnapshotSerializer(createStripAnsiSerializer());
expect.addSnapshotSerializer(
  createRecursiveSerializer(
    (v) => v.includes(process.execPath),
    (v) => v.split(Path.dirname(process.execPath)).join('<nodedir>')
  )
);

beforeEach(() => {
  testWriter.messages.length = 0;
});

it('executes a command, logs the command, and logs the output', async () => {
  await exec(log, process.execPath, ['-e', 'console.log("hi")']);
  expect(testWriter.messages).toMatchInlineSnapshot(`
    Array [
      " debg $ <nodedir>/node -e console.log(\\"hi\\")",
      " debg hi",
    ]
  `);
});

it('logs using level: option', async () => {
  await exec(log, process.execPath, ['-e', 'console.log("hi")'], {
    level: 'info',
  });
  expect(testWriter.messages).toMatchInlineSnapshot(`
    Array [
      " info $ <nodedir>/node -e console.log(\\"hi\\")",
      " info hi",
    ]
  `);
});
