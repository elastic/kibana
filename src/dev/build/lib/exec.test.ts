/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { createStripAnsiSerializer, createRecursiveSerializer } from '@kbn/jest-serializers';

import { exec } from './exec';
import { Build } from './build';
import { getMockConfig } from './__mocks__/get_config';

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

jest.mock('./build', () => ({
  Build: jest.fn().mockImplementation(() => ({
    getBufferLogs: jest.fn().mockReturnValue(true),
    getBuildDesc: jest.fn().mockReturnValue('test-build'),
  })),
}));

const config = getMockConfig();

describe('exec', () => {
  let mockBuild: jest.Mocked<Build>;

  beforeEach(() => {
    testWriter.messages.length = 0;

    jest.clearAllMocks();
    mockBuild = new Build(config, true) as jest.Mocked<Build>;
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

  it('collects and logs output when bufferLogs is true', async () => {
    await exec(log, process.execPath, ['-e', 'console.log("buffered output")'], {
      build: mockBuild,
    });

    expect(testWriter.messages).toMatchInlineSnapshot(`
      Array [
        "--- ✅ test-build",
        "   │ debg $ <nodedir>/node -e console.log(\\"buffered output\\")",
        "   │ debg buffered output",
      ]
    `);
  });

  it('throws error when command fails when bufferLogs is true', async () => {
    try {
      await expect(
        await exec(log, process.execPath, ['-e', 'process.exit(1)'], {
          build: mockBuild,
        })
      ).rejects.toThrow();
    } catch (error) {
      expect(error).toBeTruthy();
      expect(error.message).toMatchInlineSnapshot(
        `"Command failed with exit code 1: <nodedir>/node -e process.exit(1)"`
      );
    }
  });

  it('handles stderr output when bufferLogs is true', async () => {
    await exec(log, process.execPath, ['-e', 'console.error("error output: exit code 123")'], {
      build: mockBuild,
    });

    expect(testWriter.messages).toMatchInlineSnapshot(`
      Array [
        "--- ✅ test-build",
        "   │ debg $ <nodedir>/node -e console.error(\\"error output: exit code 123\\")",
        "   │ERROR error output: exit code 123",
      ]
    `);
  });
});
