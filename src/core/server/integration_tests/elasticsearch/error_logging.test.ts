/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';

describe('logging service', () => {
  describe('logs according to context name hierarchy', () => {
    let mockConsoleLog: jest.SpyInstance;
    let esServer: TestElasticsearchUtils;
    let kibanaServer: TestKibanaUtils;

    beforeAll(async () => {
      mockConsoleLog = jest.spyOn(global.console, 'log');

      const { startES, startKibana } = createTestServers({
        adjustTimeout: jest.setTimeout,
        settings: {
          kbn: {
            logging: {
              appenders: {
                'console-json': {
                  type: 'console',
                  layout: {
                    type: 'json',
                  },
                },
              },
              loggers: [{ name: 'console-json', appenders: ['console-json'], level: 'debug' }],
            },
          },
        },
      });

      esServer = await startES();
      kibanaServer = await startKibana();
    });

    beforeEach(() => {
      mockConsoleLog.mockClear();
    });

    afterAll(async () => {
      mockConsoleLog.mockRestore();
      await kibanaServer.stop();
      await esServer.stop();
    });

    it('uses the most specific context name', async () => {
      const esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
      const logger = kibanaServer.root.logger.get('console-json');

      try {
        await esClient.search({
          index: '.kibana',
          // @ts-expect-error yes this is invalid
          query: { someInvalidQuery: { foo: 'bar' } },
        });
        expect('should have thrown').toEqual('but it did not');
      } catch (e) {
        logger.info('logging elasticsearch error', e);

        const calls = mockConsoleLog.mock.calls;
        const ourCall = calls
          .map((call) => call[0])
          .find((call) => call.includes('logging elasticsearch error'));

        expect(ourCall).toBeDefined();
        expect(ourCall).toMatchInlineSnapshot(
          `"{\\"name\\":\\"ResponseError\\",\\"message\\":\\"logging elasticsearch error\\",\\"ecs\\":{\\"version\\":\\"8.6.1\\"},\\"@timestamp\\":\\"2023-11-15T09:05:28.771-05:00\\",\\"log\\":{\\"level\\":\\"INFO\\",\\"logger\\":\\"console-json\\"},\\"process\\":{\\"pid\\":21462}}"`
        );
      }
    });
  });
});
