/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as kbnTestServer from '../../../test_helpers/kbn_server';
import { InternalCoreSetup } from '../../internal_types';
import { Root } from '../../root';
import { OpsMetrics } from '../types';

const otherTestSettings = {
  ops: {
    interval: 500,
  },
  logging: {
    silent: true, // set "true" in kbnTestServer
    appenders: {
      'custom-console': {
        kind: 'console',
        layout: {
          highlight: false,
          kind: 'pattern',
          pattern: '%message|%meta',
        },
      },
    },
    root: {
      appenders: ['custom-console', 'default'],
      level: 'warn',
    },
    loggers: [
      {
        context: 'metrics.ops',
        appenders: ['custom-console'],
        level: 'debug',
      },
    ],
  },
  plugins: {
    initialize: false,
  },
};

describe('metrics service', () => {
  let root: Root;
  let coreSetup: InternalCoreSetup;
  let mockConsoleLog: jest.SpyInstance;
  let testData: OpsMetrics;

  beforeAll(async () => {
    mockConsoleLog = jest.spyOn(global.console, 'log');
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
  });

  afterAll(async () => {
    mockConsoleLog.mockRestore();
    if (root) {
      await root.shutdown();
    }
  });

  describe('setup', () => {
    it('returns ops interval and getOpsMetrics$ observable', async () => {
      root = kbnTestServer.createRoot({ ...otherTestSettings });
      coreSetup = await root.setup();
      expect(coreSetup.metrics).toHaveProperty(
        'collectionInterval',
        otherTestSettings.ops.interval
      );
      expect(coreSetup.metrics).toHaveProperty('getOpsMetrics$');
      await root.shutdown();
    });
  });

  describe('ops metrics logging configuration', () => {
    it('does not log with logging set to quiet', async () => {
      root = kbnTestServer.createRoot({ logging: { quiet: true } });
      coreSetup = await root.setup();

      coreSetup.metrics.getOpsMetrics$().subscribe((opsMetrics) => {
        testData = opsMetrics;
      });

      expect(mockConsoleLog).not.toHaveBeenCalled();
      await root.shutdown();
    });

    it('logs at the correct level and with the correct context', async () => {
      const testSettings = {
        ops: {
          interval: 500,
        },
        logging: {
          silent: true, // set "true" in kbnTestServer
          appenders: {
            'custom-console': {
              kind: 'console',
              layout: {
                highlight: false,
                kind: 'pattern',
                pattern: '%level|%logger',
              },
            },
          },
          root: {
            appenders: ['custom-console', 'default'],
            level: 'warn',
          },
          loggers: [
            {
              context: 'metrics.ops',
              appenders: ['custom-console'],
              level: 'debug',
            },
          ],
        },
        plugins: {
          initialize: false,
        },
      };
      root = kbnTestServer.createRoot({ ...testSettings });
      coreSetup = await root.setup();

      coreSetup.metrics.getOpsMetrics$().subscribe((opsMetrics) => {
        testData = opsMetrics;
      });

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const [level, logger] = mockConsoleLog.mock.calls[0][0].split('|');
      expect(level).toBe('DEBUG');
      expect(logger).toBe('metrics.ops');

      await root.shutdown();
    });
  });
  describe('ops metrics logging content', () => {
    it('logs memory, uptime, load and delay ops metrics in the message', async () => {
      root = kbnTestServer.createRoot({ ...otherTestSettings });
      coreSetup = await root.setup();

      coreSetup.metrics.getOpsMetrics$().subscribe((opsMetrics) => {
        testData = opsMetrics;
      });
      const expectedArray = ['memory:', 'uptime:', 'load:', 'delay:'];

      expect(testData).toBeTruthy();
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const [message] = mockConsoleLog.mock.calls[0][0].split('|');

      const messageParts = message.split(' ');
      const testParts = [messageParts[0], messageParts[2], messageParts[4], messageParts[6]];
      // the contents of the message are variable based on the process environment,
      // so we are only performing assertions against parts of the string
      expect(testParts).toEqual(expect.arrayContaining(expectedArray));

      await root.shutdown();
    });

    it('logs structured data in the log meta', async () => {
      root = kbnTestServer.createRoot({ ...otherTestSettings });
      coreSetup = await root.setup();

      coreSetup.metrics.getOpsMetrics$().subscribe((opsMetrics) => {
        testData = opsMetrics;
      });
      const [, meta] = mockConsoleLog.mock.calls[0][0].split('|');
      expect(Object.keys(JSON.parse(meta).host.os.load)).toEqual(['1m', '5m', '15m']);
      expect(Object.keys(JSON.parse(meta).process)).toEqual(expect.arrayContaining(['uptime']));

      await root.shutdown();
    });

    it('logs ECS fields in the log meta', async () => {
      root = kbnTestServer.createRoot({ ...otherTestSettings });
      coreSetup = await root.setup();

      coreSetup.metrics.getOpsMetrics$().subscribe((opsMetrics) => {
        testData = opsMetrics;
      });
      const [, meta] = mockConsoleLog.mock.calls[0][0].split('|');
      expect(JSON.parse(meta).kind).toBe('metric');
      expect(JSON.parse(meta).ecs.version).toBe('1.7.0');
      expect(JSON.parse(meta).category).toEqual(expect.arrayContaining(['process', 'host']));

      await root.shutdown();
    });
  });
});
