/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockCreateWriteStream, mockMkdirSync } from './file_appender.test.mocks';

import { LogRecord, LogLevel } from '@kbn/logging';
import { FileAppender } from './file_appender';

const tickMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  mockCreateWriteStream.mockReset();
  mockMkdirSync.mockReset();
});

test('`createConfigSchema()` creates correct schema.', () => {
  const appenderSchema = FileAppender.configSchema;

  const validConfig = { type: 'file', layout: { type: 'mock' }, fileName: 'path' };
  expect(appenderSchema.validate(validConfig)).toEqual({
    type: 'file',
    layout: { type: 'mock' },
    fileName: 'path',
  });

  const wrongConfig1 = {
    type: 'not-file',
    layout: { type: 'mock' },
    fileName: 'path',
  };
  expect(() => appenderSchema.validate(wrongConfig1)).toThrow();

  const wrongConfig2 = { type: 'file', layout: { type: 'mock' } };
  expect(() => appenderSchema.validate(wrongConfig2)).toThrow();

  const wrongConfig3 = { type: 'console', layout: { type: 'mock' } };
  expect(() => appenderSchema.validate(wrongConfig3)).toThrow();
});

test('file stream is created only once and only after first `append()` is called.', () => {
  mockCreateWriteStream.mockReturnValue({
    write() {
      // noop
    },
  });

  const mockPath = 'mock://path/file.log';
  const mockDir = 'mock://path';
  const appender = new FileAppender({ format: () => '' }, mockPath);

  expect(mockMkdirSync).not.toHaveBeenCalled();
  expect(mockCreateWriteStream).not.toHaveBeenCalled();

  appender.append({
    context: 'context-1',
    level: LogLevel.All,
    message: 'message-1',
    timestamp: new Date(),
    pid: 5355,
  });

  expect(mockMkdirSync).toHaveBeenCalledTimes(1);
  expect(mockMkdirSync).toHaveBeenCalledWith(mockDir, {
    recursive: true,
  });
  expect(mockCreateWriteStream).toHaveBeenCalledTimes(1);
  expect(mockCreateWriteStream).toHaveBeenCalledWith(mockPath, {
    encoding: 'utf8',
    flags: 'a',
  });

  mockMkdirSync.mockClear();
  mockCreateWriteStream.mockClear();
  appender.append({
    context: 'context-2',
    level: LogLevel.All,
    message: 'message-2',
    timestamp: new Date(),
    pid: 5355,
  });

  expect(mockMkdirSync).not.toHaveBeenCalled();
  expect(mockCreateWriteStream).not.toHaveBeenCalled();
});

test('`append()` correctly formats records and pushes them to the file.', () => {
  const mockStreamWrite = jest.fn();
  mockCreateWriteStream.mockReturnValue({ write: mockStreamWrite });

  const records: LogRecord[] = [
    {
      context: 'context-1',
      level: LogLevel.All,
      message: 'message-1',
      timestamp: new Date(),
      pid: 5355,
    },
    {
      context: 'context-2',
      level: LogLevel.Trace,
      message: 'message-2',
      timestamp: new Date(),
      pid: 5355,
    },
    {
      context: 'context-3',
      error: new Error('Error'),
      level: LogLevel.Fatal,
      message: 'message-3',
      timestamp: new Date(),
      pid: 5355,
    },
  ];

  const appender = new FileAppender(
    {
      format(record) {
        return `mock-${JSON.stringify(record)}`;
      },
    },
    'mock://path/file.log'
  );

  for (const record of records) {
    appender.append(record);
    expect(mockStreamWrite).toHaveBeenCalledWith(`mock-${JSON.stringify(record)}\n`);
  }

  expect(mockStreamWrite).toHaveBeenCalledTimes(records.length);
});

test('`dispose()` succeeds even if stream is not created.', async () => {
  const appender = new FileAppender({ format: () => '' }, 'mock://path/file.log');

  await appender.dispose();
});

test('`dispose()` closes stream.', async () => {
  const mockStreamEndFinished = jest.fn();
  const mockStreamEnd = jest.fn(async (callback) => {
    // It's required to make sure `dispose` waits for `end` to complete.
    await tickMs(100);
    mockStreamEndFinished();
    callback();
  });

  mockCreateWriteStream.mockReturnValue({
    end: mockStreamEnd,
    write: () => {
      // noop
    },
  });

  const appender = new FileAppender({ format: () => '' }, 'mock://path/file.log');
  appender.append({
    context: 'context-1',
    level: LogLevel.All,
    message: 'message-1',
    timestamp: new Date(),
    pid: 5355,
  });

  await appender.dispose();

  expect(mockStreamEnd).toHaveBeenCalledTimes(1);
  expect(mockStreamEnd).toHaveBeenCalledWith(expect.any(Function));
  expect(mockStreamEndFinished).toHaveBeenCalled();

  // Consequent `dispose` calls should not fail even if stream has been disposed.
  await appender.dispose();
});
