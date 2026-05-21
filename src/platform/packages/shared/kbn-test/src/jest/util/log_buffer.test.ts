/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockStdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

jest.mock('fs', () => {
  const { EventEmitter: EE } = jest.requireActual('events');
  const makeWriteStream = () => {
    const s: any = new EE();
    s.write = jest.fn().mockReturnValue(true);
    s.end = jest.fn(() => {
      s.closed = true;
      process.nextTick(() => s.emit('finish'));
    });
    s.closed = false;
    return s;
  };
  const makeReadStream = () => {
    const s: any = new EE();
    process.nextTick(() => s.emit('end'));
    return s;
  };
  return {
    promises: {
      unlink: jest.fn().mockResolvedValue(undefined),
    },
    createWriteStream: jest.fn(makeWriteStream),
    createReadStream: jest.fn(makeReadStream),
  };
});

jest.mock('stream/promises', () => ({
  pipeline: jest.fn().mockResolvedValue(undefined),
}));

import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createLogBuffer } from './log_buffer';

describe('log_buffer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStdoutWrite.mockClear();
    delete process.env.TEST_TYPE;
    delete process.env.JEST_LOG_BUFFER;
  });

  afterAll(() => {
    mockStdoutWrite.mockRestore();
  });

  describe('memory log buffer', () => {
    it('writes appended output on writeToLog', async () => {
      const buffer = createLogBuffer({ kind: 'memory', outputFilePath: '' });
      buffer.append(Buffer.from('hello\n'));
      await buffer.finalize();
      await buffer.writeToLog();

      expect(mockStdoutWrite).toHaveBeenCalledWith('hello\n');
      expect(createWriteStream).not.toHaveBeenCalled();
    });
  });

  describe('file log buffer', () => {
    it('streams from disk on writeToLog', async () => {
      const buffer = createLogBuffer({ kind: 'file', outputFilePath: '/tmp/out.log' });
      buffer.append(Buffer.from('chunk'));
      await buffer.finalize();
      await buffer.writeToLog();
      await buffer.dispose();

      expect(createWriteStream).toHaveBeenCalledWith('/tmp/out.log');
      expect(pipeline).toHaveBeenCalled();
    });
  });
});
