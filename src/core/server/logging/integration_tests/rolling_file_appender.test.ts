/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import { rm, mkdtemp, readFile, readdir } from 'fs/promises';
import moment from 'moment-timezone';
import * as kbnTestServer from '../../../test_helpers/kbn_server';
import { getNextRollingTime } from '../appenders/rolling_file/policies/time_interval/get_next_rolling_time';

const flushDelay = 250;
const delay = (waitInMs: number) => new Promise((resolve) => setTimeout(resolve, waitInMs));
const flush = async () => delay(flushDelay);

function createRoot(appenderConfig: any) {
  return kbnTestServer.createRoot({
    logging: {
      appenders: {
        'rolling-file': appenderConfig,
      },
      loggers: [
        {
          name: 'test.rolling.file',
          appenders: ['rolling-file'],
          level: 'debug',
        },
      ],
    },
  });
}

describe('RollingFileAppender', () => {
  let root: ReturnType<typeof createRoot>;
  let testDir: string;
  let logFile: string;

  const getFileContent = async (basename: string) =>
    (await readFile(join(testDir, basename))).toString('utf-8');

  beforeEach(async () => {
    testDir = await mkdtemp('rolling-test');
    logFile = join(testDir, 'kibana.log');
  });

  afterEach(async () => {
    if (testDir) {
      await rm(testDir, { recursive: true });
    }

    if (root) {
      await root.shutdown();
    }
  });

  const message = (index: number) => `some message of around 40 bytes number ${index}`;
  const expectedFileContent = (indices: number[]) => indices.map(message).join('\n') + '\n';

  // FLAKY: https://github.com/elastic/kibana/issues/108633
  describe.skip('`size-limit` policy with `numeric` strategy', () => {
    it('rolls the log file in the correct order', async () => {
      root = createRoot({
        type: 'rolling-file',
        fileName: logFile,
        layout: {
          type: 'pattern',
          pattern: '%message',
        },
        policy: {
          type: 'size-limit',
          size: '100b',
        },
        strategy: {
          type: 'numeric',
          max: 5,
          pattern: '.%i',
        },
      });
      await root.preboot();
      await root.setup();

      const logger = root.logger.get('test.rolling.file');

      // size = 100b, message.length ~= 40b, should roll every 3 message

      // last file - 'kibana.2.log'
      logger.info(message(1));
      logger.info(message(2));
      logger.info(message(3));
      // roll - 'kibana.1.log'
      logger.info(message(4));
      logger.info(message(5));
      logger.info(message(6));
      // roll - 'kibana.log'
      logger.info(message(7));

      await flush();

      const files = await readdir(testDir);

      expect(files.sort()).toEqual(['kibana.1.log', 'kibana.2.log', 'kibana.log']);
      expect(await getFileContent('kibana.log')).toEqual(expectedFileContent([7]));
      expect(await getFileContent('kibana.1.log')).toEqual(expectedFileContent([4, 5, 6]));
      expect(await getFileContent('kibana.2.log')).toEqual(expectedFileContent([1, 2, 3]));
    });

    it('only keep the correct number of files', async () => {
      root = createRoot({
        type: 'rolling-file',
        fileName: logFile,
        layout: {
          type: 'pattern',
          pattern: '%message',
        },
        policy: {
          type: 'size-limit',
          size: '60b',
        },
        strategy: {
          type: 'numeric',
          max: 2,
          pattern: '-%i',
        },
      });
      await root.preboot();
      await root.setup();

      const logger = root.logger.get('test.rolling.file');

      // size = 60b, message.length ~= 40b, should roll every 2 message

      // last file - 'kibana-3.log' (which will be removed during the last rolling)
      logger.info(message(1));
      logger.info(message(2));
      // roll - 'kibana-2.log'
      logger.info(message(3));
      logger.info(message(4));
      // roll - 'kibana-1.log'
      logger.info(message(5));
      logger.info(message(6));
      // roll - 'kibana.log'
      logger.info(message(7));
      logger.info(message(8));

      await flush();

      const files = await readdir(testDir);

      expect(files.sort()).toEqual(['kibana-1.log', 'kibana-2.log', 'kibana.log']);
      expect(await getFileContent('kibana.log')).toEqual(expectedFileContent([7, 8]));
      expect(await getFileContent('kibana-1.log')).toEqual(expectedFileContent([5, 6]));
      expect(await getFileContent('kibana-2.log')).toEqual(expectedFileContent([3, 4]));
    });
  });

  describe('`time-interval` policy with `numeric` strategy', () => {
    it('rolls the log file at the given interval', async () => {
      root = createRoot({
        type: 'rolling-file',
        fileName: logFile,
        layout: {
          type: 'pattern',
          pattern: '%message',
        },
        policy: {
          type: 'time-interval',
          interval: '1s',
          modulate: true,
        },
        strategy: {
          type: 'numeric',
          max: 2,
          pattern: '-%i',
        },
      });
      await root.preboot();
      await root.setup();

      const logger = root.logger.get('test.rolling.file');

      const waitForNextRollingTime = () => {
        const now = Date.now();
        const nextRolling = getNextRollingTime(now, moment.duration(1, 'second'), true);
        return delay(nextRolling - now + 1);
      };

      // wait for a rolling time boundary to minimize the risk to have logs emitted in different intervals
      // the `1s` interval should be way more than enough to log 2 messages
      await waitForNextRollingTime();

      logger.info(message(1));
      logger.info(message(2));

      await waitForNextRollingTime();

      logger.info(message(3));
      logger.info(message(4));

      await flush();

      const files = await readdir(testDir);

      expect(files.sort()).toEqual(['kibana-1.log', 'kibana.log']);
      expect(await getFileContent('kibana.log')).toEqual(expectedFileContent([3, 4]));
      expect(await getFileContent('kibana-1.log')).toEqual(expectedFileContent([1, 2]));
    });
  });
});
