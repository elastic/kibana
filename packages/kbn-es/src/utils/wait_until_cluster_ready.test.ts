/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { waitUntilClusterReady } from './wait_until_cluster_ready';

jest.mock('@elastic/elasticsearch', () => {
  return {
    Client: jest.fn(),
  };
});

const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);

const health = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  jest
    .requireMock('@elastic/elasticsearch')
    .Client.mockImplementation(() => ({ cluster: { health } }));
  log.indent(-log.getIndent());
  logWriter.messages.length = 0;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('waitUntilClusterReady', () => {
  test(`waits for node to return 'green' status`, async () => {
    health.mockImplementationOnce(() => Promise.reject(new Error('foo')));
    health.mockImplementationOnce(() => Promise.resolve({ status: 'red' }));
    health.mockImplementationOnce(() => Promise.resolve({ status: 'yellow' }));
    health.mockImplementationOnce(() => Promise.resolve({ status: 'green' })); // 4th call returns expected status

    const client = new Client({});

    await waitUntilClusterReady({ client, log, expectedStatus: 'green' });
    expect(health).toHaveBeenCalledTimes(4);
    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " [34minfo[39m waiting for ES cluster to report a green status",
        " [33mwarn[39m waiting for ES cluster to come online, attempt 1 failed with: foo",
        " [32msucc[39m ES cluster is ready",
      ]
    `);
  }, 10000);

  test(`waits for node to return 'yellow' status`, async () => {
    health.mockImplementationOnce(() => Promise.reject(new Error('foo')));
    health.mockImplementationOnce(() => Promise.resolve({ status: 'red' }));
    health.mockImplementationOnce(() => Promise.resolve({ status: 'YELLOW' })); // 3rd call returns expected status
    health.mockImplementationOnce(() => Promise.resolve({ status: 'yellow' }));
    health.mockImplementationOnce(() => Promise.resolve({ status: 'green' }));

    const client = new Client({});

    await waitUntilClusterReady({ client, log, expectedStatus: 'yellow' });
    expect(health).toHaveBeenCalledTimes(3);
    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " [34minfo[39m waiting for ES cluster to report a yellow status",
        " [33mwarn[39m waiting for ES cluster to come online, attempt 1 failed with: foo",
        " [32msucc[39m ES cluster is ready",
      ]
    `);
  }, 10000);

  test(`rejects when 'readyTimeout' is exceeded`, async () => {
    health.mockImplementationOnce(() => Promise.reject(new Error('foo')));
    health.mockImplementationOnce(() => Promise.resolve({ status: 'red' }));
    const client = new Client({});
    await expect(
      waitUntilClusterReady({ client, log, expectedStatus: 'yellow', readyTimeout: 1000 })
    ).rejects.toThrow('ES cluster failed to come online with the 1 second timeout');
  });
});
