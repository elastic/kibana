/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
