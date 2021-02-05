/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as kbnTestServer from '../../../test_helpers/kbn_server';

function createRoot() {
  return kbnTestServer.createRoot({
    logging: {
      silent: true, // set "true" in kbnTestServer
      timezone: 'GMT',
      appenders: {
        'test-timezone-SAJHB': {
          kind: 'console',
          layout: {
            highlight: false,
            kind: 'pattern',
            pattern: '%date{ISO8601_TZ}{Africa/Johannesburg}',
          },
        },
        'test-timezone-use-root': {
          kind: 'console',
          layout: {
            highlight: false,
            kind: 'pattern',
            pattern: '%date',
          },
        },
      },
      loggers: [
        {
          context: 'datemodifiertimezone',
          appenders: ['test-timezone-SAJHB'],
          level: 'info',
        },
        {
          context: 'mainloggingtimezone',
          appenders: ['test-timezone-use-root'],
          level: 'info',
        },
      ],
    },
  });
}

const nonGlobalRegex = new RegExp('^[0-9]+');

describe('logging service', () => {
  describe('logs date with timezone specified', () => {
    let root: ReturnType<typeof createRoot>;
    let mockConsoleLog: jest.SpyInstance;
    beforeAll(async () => {
      mockConsoleLog = jest.spyOn(global.console, 'log');
      root = createRoot();

      await root.setup();
    }, 30000);

    beforeEach(() => {
      mockConsoleLog.mockClear();
    });

    afterAll(async () => {
      mockConsoleLog.mockRestore();
      await root.shutdown();
    });

    it('uses specified date modifier timezone', () => {
      const logger = root.logger.get('datemodifiertimezone');

      logger.info('info from "datemodifiertimezone" context');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const dateTimezoneModifier = mockConsoleLog.mock.calls[0][0]
        .split('.')[1]
        .replace(nonGlobalRegex, 'x');
      expect(dateTimezoneModifier.endsWith('+02:00')).toBe(true);
    });

    it('uses root logging date timezone', () => {
      const logger = root.logger.get('mainloggingtimezone');

      logger.info('info from "mainloggingtimezone" context');
      const dateTimezoneModifier = mockConsoleLog.mock.calls[0][0]
        .split('.')[1]
        .replace(nonGlobalRegex, 'x');
      expect(dateTimezoneModifier.endsWith('-05:00')).toBe(true);
    });

    it('falls back to the root settings', () => {
      const logger = root.logger.get('fallback');

      logger.info('info from "fallback" context');

      // output muted by silent: true
      expect(mockConsoleLog).toHaveBeenCalledTimes(0);
    });
  });
});
