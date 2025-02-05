/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { logStateTransition, type LogAwareState } from './logs';

describe('logStateTransition', () => {
  let logger: MockedLogger;

  const messagePrefix = '[PREFIX] ';

  beforeEach(() => {
    logger = loggerMock.create();
  });

  describe('when DEBUG log level is not enabled', () => {
    beforeEach(() => {
      logger.isLevelEnabled.mockImplementation((level) => {
        return level !== 'debug';
      });
    });

    it('logs the offset of messages between the old and the new state', () => {
      logger.isLevelEnabled.mockImplementation((level) => {
        return level !== 'debug';
      });

      const previous: LogAwareState = {
        controlState: 'PREVIOUS',
        logs: [],
      };
      const next: LogAwareState = {
        controlState: 'NEXT',
        logs: [
          ...previous.logs,
          { level: 'info', message: 'info message' },
          { level: 'warning', message: 'warning message' },
        ],
      };

      logStateTransition(logger, messagePrefix, previous, next, 500);

      expect(loggerMock.collect(logger)).toEqual({
        error: [],
        fatal: [],
        info: [['[PREFIX] info message'], ['[PREFIX] PREVIOUS -> NEXT. took: 500ms.']],
        log: [],
        trace: [],
        warn: [['[PREFIX] warning message']],
        debug: [],
      });
    });
  });

  describe('when DEBUG log level is enabled', () => {
    beforeEach(() => {
      logger.isLevelEnabled.mockReturnValue(true);
    });

    it('logs a debug message with the correct meta', () => {
      const previous: LogAwareState = {
        controlState: 'PREVIOUS',
        logs: [],
      };
      const next: LogAwareState = {
        controlState: 'NEXT',
        logs: [
          ...previous.logs,
          { level: 'info', message: 'info message' },
          { level: 'warning', message: 'warning message' },
        ],
      };

      logStateTransition(logger, messagePrefix, previous, next, 500);

      expect(loggerMock.collect(logger).debug).toEqual([
        [
          '[PREFIX] PREVIOUS -> NEXT. took: 500ms.',
          {
            kibana: {
              migrations: {
                duration: 500,
                state: expect.objectContaining({
                  controlState: 'NEXT',
                }),
              },
            },
          },
        ],
      ]);
    });
  });
});
