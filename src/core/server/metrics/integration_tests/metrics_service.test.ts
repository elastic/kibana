/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import numeral from '@elastic/numeral';
import { OpsMetrics } from '..';
import * as kbnTestServer from '../../../test_helpers/kbn_server';
import { InternalCoreSetup } from '../../internal_types';
import { Root } from '../../root';

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
          pattern: '%message',
        },
      },
    },
    loggers: [
      {
        context: 'metrics',
        appenders: ['custom-console'],
        level: 'info',
      },
    ],
  },
};

function extractTestMetricsOfInterest({ process, os }: Partial<OpsMetrics>) {
  const memoryLogEntryinMB = numeral(process?.memory?.heap?.used_in_bytes ?? 0).format('0.0b');
  const uptimeLogEntry = numeral((process?.uptime_in_millis ?? 0) / 1000).format('00:00:00');
  const loadLogEntry = [...Object.values(os?.load ?? [])]
    .map((val: number) => {
      return numeral(val).format('0.00');
    })
    .join(' ');
  const delayLogEntry = numeral(process?.event_loop_delay ?? 0).format('0.000');
  return `memory: ${memoryLogEntryinMB} uptime: ${uptimeLogEntry} load: [${loadLogEntry}] delay: ${delayLogEntry}`;
}

describe('metrics service', () => {
  let root: Root;
  let coreSetup: InternalCoreSetup;
  let mockConsoleLog: jest.SpyInstance;
  let testData: Partial<OpsMetrics>;

  describe('setup', () => {
    beforeAll(async () => {
      mockConsoleLog = jest.spyOn(global.console, 'log');
      mockConsoleLog.mockClear();
      root = kbnTestServer.createRoot({ ...otherTestSettings });
      coreSetup = await root.setup();
    });

    afterAll(async () => {
      await root.shutdown();
      mockConsoleLog.mockRestore();
    });

    it('returns ops interval and getOpsMetrics$ observable', async () => {
      expect(coreSetup.metrics).toHaveProperty(
        'collectionInterval',
        otherTestSettings.ops.interval
      );
      expect(coreSetup.metrics).toHaveProperty('getOpsMetrics$');
    });

    it('logs memory, uptime, load and delay ops metrics', async () => {
      coreSetup.metrics.getOpsMetrics$().subscribe((opsMetrics) => {
        testData = opsMetrics;
      });
      expect(mockConsoleLog).toHaveBeenLastCalledWith(extractTestMetricsOfInterest(testData));
    });
  });
});
