/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockCreateWriteStream, resetAllMocks } from './rolling_file_manager.test.mocks';

import { EventEmitter } from 'events';

import type { LogFileWriteErrorHandler } from '@kbn/core-logging-server';

import { rollingFileAppenderMocks } from './mocks';
import { RollingFileManager } from './rolling_file_manager';

const FILE_PATH = '/var/log/kibana/audit.log';

const createMockStream = () =>
  Object.assign(new EventEmitter(), { write: jest.fn(), end: jest.fn((cb) => cb?.()) });

const enospc = () =>
  Object.assign(new Error(`ENOSPC: no space left on device, write '${FILE_PATH}'`), {
    code: 'ENOSPC',
  });

const createManager = (onWriteError?: LogFileWriteErrorHandler) =>
  new RollingFileManager(rollingFileAppenderMocks.createContext(FILE_PATH), onWriteError);

beforeEach(() => {
  resetAllMocks();
});

afterAll(() => {
  resetAllMocks();
});

describe('RollingFileManager', () => {
  describe('when no `onWriteError` handler is configured', () => {
    it('does not subscribe to stream errors, leaving them unhandled as before', () => {
      const stream = createMockStream();
      const onSpy = jest.spyOn(stream, 'on');
      mockCreateWriteStream.mockReturnValue(stream);

      createManager().write('record\n');

      expect(onSpy).not.toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('when an `onWriteError` handler is configured', () => {
    it('reports a stream failure instead of crashing the process', () => {
      const stream = createMockStream();
      mockCreateWriteStream.mockReturnValue(stream);
      const onWriteError = jest.fn();

      createManager(onWriteError).write('record\n');

      expect(() => stream.emit('error', enospc())).not.toThrow();
      expect(onWriteError).toHaveBeenCalledWith({
        path: FILE_PATH,
        code: 'ENOSPC',
        reason: expect.stringContaining('no space left on device'),
      });
    });

    it('reports errors from a stream reopened after a rollover', async () => {
      const beforeRollover = createMockStream();
      const afterRollover = createMockStream();
      mockCreateWriteStream.mockReturnValueOnce(beforeRollover).mockReturnValue(afterRollover);
      const onWriteError = jest.fn();

      const manager = createManager(onWriteError);
      manager.write('record\n');
      // A rollover closes the stream; the next write has to open — and re-listen to — a new one.
      await manager.closeStream();
      manager.write('record\n');

      expect(mockCreateWriteStream).toHaveBeenCalledTimes(2);
      expect(() => afterRollover.emit('error', enospc())).not.toThrow();
      expect(onWriteError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'ENOSPC', path: FILE_PATH })
      );
    });

    it.each(['not-a-function', 42, true, null])(
      'ignores a non-function %p, leaving stream errors unhandled',
      (onWriteError) => {
        const stream = createMockStream();
        const onSpy = jest.spyOn(stream, 'on');
        mockCreateWriteStream.mockReturnValue(stream);

        createManager(onWriteError as unknown as LogFileWriteErrorHandler).write('record\n');

        expect(onSpy).not.toHaveBeenCalledWith('error', expect.any(Function));
      }
    );
  });
});
