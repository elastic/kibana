/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CriticalError } from '@kbn/core-base-server-internal';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { FatalExitLogging } from './register_fatal_exit_logging';
import { registerFatalExitLogging } from './register_fatal_exit_logging';

// `process.emit` types don't accept the `origin` argument that Node passes in production.
const emitUncaughtExceptionMonitor = (error: Error, origin = 'uncaughtException') =>
  (process as NodeJS.EventEmitter).emit('uncaughtExceptionMonitor', error, origin);

describe('registerFatalExitLogging', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let consoleErrorSpy: jest.SpyInstance;
  let fatalExitLogging: FatalExitLogging;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fatalExitLogging = registerFatalExitLogging({ logger });
  });

  afterEach(() => {
    fatalExitLogging.unregister();
    consoleErrorSpy.mockRestore();
  });

  describe('uncaught exceptions', () => {
    it('logs fatal with the error attached and mirrors to stderr', () => {
      const error = new Error('something went wrong');

      emitUncaughtExceptionMonitor(error);

      expect(logger.fatal).toHaveBeenCalledTimes(1);
      expect(logger.fatal).toHaveBeenCalledWith(
        'Kibana is shutting down due to an uncaughtException',
        { error }
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0][0]).toMatch(
        /Kibana is shutting down due to an uncaughtException: Error: something went wrong\n.*at /
      );
    });

    it('logs an uncaught CriticalError, which never reaches the root shutdown path', () => {
      const error = new CriticalError('something went wrong', 'ERROR_CODE', 1234);

      emitUncaughtExceptionMonitor(error);

      expect(logger.fatal).toHaveBeenCalledWith(
        'Kibana is shutting down due to an uncaughtException',
        { error }
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('mirrors to stderr even when the logger throws', () => {
      logger.fatal.mockImplementation(() => {
        throw new Error('the logging system is broken too');
      });

      emitUncaughtExceptionMonitor(new Error('something went wrong'));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain(
        'Kibana is shutting down due to an uncaughtException'
      );
    });

    it('silences the exit guard once the exception has been reported', () => {
      emitUncaughtExceptionMonitor(new Error('something went wrong'));
      consoleErrorSpy.mockClear();

      process.emit('exit', 1);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('unexpected exits', () => {
    it('mirrors a fatal line to stderr for a non-zero exit code', () => {
      process.emit('exit', 7);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain(
        'Kibana is shutting down unexpectedly with exit code 7'
      );
    });

    it('stays silent for a zero exit code', () => {
      process.emit('exit', 0);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('stays silent once the shutdown reason has been reported', () => {
      fatalExitLogging.markShutdownReasonReported();

      process.emit('exit', 1);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
