/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockCreateWriteStream, mockMkdirSync } from './file_appender.test.mocks';

import { EventEmitter } from 'events';

import type { LogFileWriteErrorHandler } from '@kbn/core-logging-server';
import type { LogRecord } from '@kbn/logging';
import { LogLevel } from '@kbn/logging';
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

describe('write failures', () => {
  const record: LogRecord = {
    context: 'context-1',
    level: LogLevel.All,
    message: 'message-1',
    timestamp: new Date(),
    pid: 5355,
  };

  const createMockStream = () => Object.assign(new EventEmitter(), { write: jest.fn() });

  const enospc = () =>
    Object.assign(new Error("ENOSPC: no space left on device, write 'mock://path/file.log'"), {
      code: 'ENOSPC',
    });

  describe('when no `onWriteError` handler is configured', () => {
    it('keeps letting a synchronous failure escape, so the process still crashes', () => {
      mockMkdirSync.mockImplementation(() => {
        throw enospc();
      });

      const appender = new FileAppender({ format: () => '' }, 'mock://path/file.log');

      expect(() => appender.append(record)).toThrow('ENOSPC');
    });

    it.each(['not-a-function', 42, true, null])(
      'ignores a non-function %p, leaving stream errors unhandled',
      (onWriteError) => {
        const stream = createMockStream();
        const onSpy = jest.spyOn(stream, 'on');
        mockCreateWriteStream.mockReturnValue(stream);

        new FileAppender(
          { format: () => '' },
          'mock://path/file.log',
          onWriteError as unknown as LogFileWriteErrorHandler
        ).append(record);

        expect(onSpy).not.toHaveBeenCalledWith('error', expect.any(Function));
      }
    );

    it('does not subscribe to stream errors, leaving them unhandled as before', () => {
      const stream = createMockStream();
      const onSpy = jest.spyOn(stream, 'on');
      mockCreateWriteStream.mockReturnValue(stream);

      new FileAppender({ format: () => '' }, 'mock://path/file.log').append(record);

      expect(onSpy).not.toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('when an `onWriteError` handler is configured', () => {
    it('still lets a synchronous failure escape, since only stream errors are reported', () => {
      mockMkdirSync.mockImplementation(() => {
        throw enospc();
      });
      const onWriteError = jest.fn();

      const appender = new FileAppender({ format: () => '' }, 'mock://path/file.log', onWriteError);

      expect(() => appender.append(record)).toThrow('ENOSPC');
      expect(onWriteError).not.toHaveBeenCalled();
    });

    it('reports an asynchronous stream failure instead of crashing the process', () => {
      const stream = createMockStream();
      mockCreateWriteStream.mockReturnValue(stream);
      const onWriteError = jest.fn();

      const appender = new FileAppender({ format: () => '' }, 'mock://path/file.log', onWriteError);
      appender.append(record);

      expect(() => stream.emit('error', enospc())).not.toThrow();
      expect(onWriteError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'ENOSPC', path: 'mock://path/file.log' })
      );
    });

    it('lets a layout failure through instead of blaming the file', () => {
      const stream = createMockStream();
      mockCreateWriteStream.mockReturnValue(stream);
      const onWriteError = jest.fn();
      const boom = new Error('Converting circular structure to JSON');

      const appender = new FileAppender(
        {
          format: () => {
            throw boom;
          },
        },
        'mock://path/file.log',
        onWriteError
      );

      expect(() => appender.append(record)).toThrow(boom);
      expect(onWriteError).not.toHaveBeenCalled();
    });

    it('keeps accepting records after a layout failure', () => {
      const stream = createMockStream();
      mockCreateWriteStream.mockReturnValue(stream);
      let shouldThrow = true;

      const appender = new FileAppender(
        {
          format: () => {
            if (shouldThrow) {
              throw new Error('Converting circular structure to JSON');
            }
            return 'formatted';
          },
        },
        'mock://path/file.log',
        jest.fn()
      );

      expect(() => appender.append(record)).toThrow();
      shouldThrow = false;
      appender.append(record);

      expect(stream.write).toHaveBeenCalledWith('formatted\n');
    });
  });
});
