import * as mockSchema from '../../../lib/schema';

const mockCreateLayoutConfigSchema = jest.fn();
jest.mock('../../layouts/Layouts', () => ({
  Layouts: { createConfigSchema: mockCreateLayoutConfigSchema }
}));

const mockCreateWriteStream = jest.fn();
jest.mock('fs', () => ({ createWriteStream: mockCreateWriteStream }));

import { LogLevel } from '../../LogLevel';
import { LogRecord } from '../../LogRecord';
import { FileAppender } from '../file/FileAppender';

const tickMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

beforeEach(() => {
  mockCreateLayoutConfigSchema.mockReset();
  mockCreateWriteStream.mockReset();
});

test('`createConfigSchema()` creates correct schema.', () => {
  mockCreateLayoutConfigSchema.mockReturnValue(
    mockSchema.object({
      kind: mockSchema.literal('mock')
    })
  );

  const appenderSchema = FileAppender.createConfigSchema(mockSchema);

  const validConfig = { kind: 'file', layout: { kind: 'mock' }, path: 'path' };
  expect(appenderSchema.validate(validConfig)).toEqual({
    kind: 'file',
    layout: { kind: 'mock' },
    path: 'path'
  });

  const wrongConfig1 = {
    kind: 'not-file',
    layout: { kind: 'mock' },
    path: 'path'
  };
  expect(() => appenderSchema.validate(wrongConfig1)).toThrow();

  const wrongConfig2 = { kind: 'file', layout: { kind: 'mock' } };
  expect(() => appenderSchema.validate(wrongConfig2)).toThrow();

  const wrongConfig3 = { kind: 'console', layout: { kind: 'mock' } };
  expect(() => appenderSchema.validate(wrongConfig3)).toThrow();
});

test('file stream is created only once and only after first `append()` is called.', () => {
  mockCreateWriteStream.mockReturnValue({ write() {} });

  const mockPath = 'mock://path/file.log';
  const appender = new FileAppender({ format: () => '' }, mockPath);

  expect(mockCreateWriteStream).not.toHaveBeenCalled();

  appender.append({
    timestamp: new Date(),
    message: 'message-1',
    context: 'context-1',
    level: LogLevel.All
  });

  expect(mockCreateWriteStream).toHaveBeenCalledTimes(1);
  expect(mockCreateWriteStream).toHaveBeenCalledWith(mockPath, {
    flags: 'a',
    defaultEncoding: 'utf8'
  });

  mockCreateWriteStream.mockClear();
  appender.append({
    timestamp: new Date(),
    message: 'message-2',
    context: 'context-2',
    level: LogLevel.All
  });

  expect(mockCreateWriteStream).not.toHaveBeenCalled();
});

test('`append()` correctly formats records and pushes them to the file.', () => {
  const mockStreamWrite = jest.fn();
  mockCreateWriteStream.mockReturnValue({ write: mockStreamWrite });

  const records: LogRecord[] = [
    {
      timestamp: new Date(),
      message: 'message-1',
      context: 'context-1',
      level: LogLevel.All
    },
    {
      timestamp: new Date(),
      message: 'message-2',
      context: 'context-2',
      level: LogLevel.Trace
    },
    {
      timestamp: new Date(),
      message: 'message-3',
      context: 'context-3',
      error: new Error('Error'),
      level: LogLevel.Fatal
    }
  ];

  const appender = new FileAppender(
    {
      format(record) {
        return `mock-${JSON.stringify(record)}`;
      }
    },
    'mock://path/file.log'
  );

  for (const record of records) {
    appender.append(record);
    expect(mockStreamWrite).toHaveBeenCalledWith(
      `mock-${JSON.stringify(record)}\n`
    );
  }

  expect(mockStreamWrite).toHaveBeenCalledTimes(records.length);
});

test('`dispose()` succeeds even if stream is not created.', async () => {
  const appender = new FileAppender(
    { format: () => '' },
    'mock://path/file.log'
  );

  await appender.dispose();
});

test('`dispose()` closes stream.', async () => {
  const mockStreamEndFinished = jest.fn();
  const mockStreamEnd = jest.fn(async (chunk, encoding, callback) => {
    // It's required to make sure `dispose` waits for `end` to complete.
    await tickMs(100);
    mockStreamEndFinished();
    callback();
  });

  mockCreateWriteStream.mockReturnValue({
    write: () => {},
    end: mockStreamEnd
  });

  const appender = new FileAppender(
    { format: () => '' },
    'mock://path/file.log'
  );
  appender.append({
    timestamp: new Date(),
    message: 'message-1',
    context: 'context-1',
    level: LogLevel.All
  });

  await appender.dispose();

  expect(mockStreamEnd).toHaveBeenCalledTimes(1);
  expect(mockStreamEnd).toHaveBeenCalledWith(
    undefined,
    undefined,
    expect.any(Function)
  );
  expect(mockStreamEndFinished).toHaveBeenCalled();

  // Consequent `dispose` calls should not fail even if stream has been disposed.
  await appender.dispose();
});
