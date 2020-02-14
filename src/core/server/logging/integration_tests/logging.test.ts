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

import * as kbnTestServer from '../../../../test_utils/kbn_server';

function createRoot() {
  return kbnTestServer.createRoot({
    logging: {
      silent: true, // set "true" in kbnTestServer
      appenders: {
        'test-console': {
          kind: 'console',
          layout: {
            highlight: false,
            kind: 'pattern',
            pattern: '%level|%logger|%message',
          },
        },
      },
      loggers: [
        {
          context: 'parent',
          appenders: ['test-console'],
          level: 'warn',
        },
        {
          context: 'parent.child',
          appenders: ['test-console'],
          level: 'error',
        },
      ],
    },
  });
}

describe('logging service', () => {
  describe('logs according to context hierarchy', () => {
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

    it('uses the most specific context', () => {
      const logger = root.logger.get('parent.child');

      logger.error('error from "parent.child" context');
      logger.warn('warning from "parent.child" context');
      logger.info('info from "parent.child" context');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'ERROR|parent.child|error from "parent.child" context'
      );
    });

    it('uses parent context', () => {
      const logger = root.logger.get('parent.another-child');

      logger.error('error from "parent.another-child" context');
      logger.warn('warning from "parent.another-child" context');
      logger.info('info from "parent.another-child" context');

      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        1,
        'ERROR|parent.another-child|error from "parent.another-child" context'
      );
      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        2,
        'WARN |parent.another-child|warning from "parent.another-child" context'
      );
    });

    it('falls back to the root settings', () => {
      const logger = root.logger.get('fallback');

      logger.error('error from "fallback" context');
      logger.warn('warning from fallback" context');
      logger.info('info from "fallback" context');

      // output muted by silent: true
      expect(mockConsoleLog).toHaveBeenCalledTimes(0);
    });
  });
});
