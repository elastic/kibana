/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { unsafeConsole } from '@kbn/security-hardening';

describe('Elasticsearch max response size', () => {
  let mockConsoleLog: jest.SpyInstance;
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;

  beforeAll(async () => {
    mockConsoleLog = jest.spyOn(unsafeConsole, 'log');

    const { startES, startKibana } = createTestServers({
      adjustTimeout: jest.setTimeout,
      settings: {
        kbn: {
          logging: {
            appenders: {
              'test-appender': {
                type: 'console',
                layout: {
                  type: 'pattern',
                },
              },
            },
            loggers: [
              { name: 'elasticsearch.warnings', appenders: ['test-appender'], level: 'info' },
            ],
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

  it('rejects the response when the response size is larger than the requested limit', async () => {
    const esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    try {
      await esClient.cluster.stats({}, { maxResponseSize: 200 });
      expect('should have thrown').toEqual('but it did not');
    } catch (e) {
      expect(e.name).toEqual('RequestAbortedError');
      expect(e.message).toContain('is bigger than the maximum allowed string (200)');
    }
  });

  it('logs a warning with the expected message', async () => {
    const esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    try {
      await esClient.cluster.stats({}, { maxResponseSize: 200 });
      expect('should have thrown').toEqual('but it did not');
    } catch (e) {
      const calls = mockConsoleLog.mock.calls;

      const warningCall = calls
        .map((call) => call[0])
        .find((call) => call.includes('elasticsearch.warnings'));
      expect(warningCall).toContain(
        'Request against GET /_cluster/stats was aborted: The content length'
      );
      expect(warningCall).toContain('is bigger than the maximum allowed string (200)');
    }
  });
});
