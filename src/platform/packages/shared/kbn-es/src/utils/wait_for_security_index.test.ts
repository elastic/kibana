/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { waitForSecurityIndex } from './wait_for_security_index';
import { createStripAnsiSerializer } from '@kbn/jest-serializers';

expect.addSnapshotSerializer(createStripAnsiSerializer());

jest.mock('@elastic/elasticsearch', () => {
  return {
    Client: jest.fn(),
  };
});

const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);

const createApiKey = jest.fn();
const invalidateApiKey = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  jest
    .requireMock('@elastic/elasticsearch')
    .Client.mockImplementation(() => ({ security: { createApiKey, invalidateApiKey } }));
  log.indent(-log.getIndent());
  logWriter.messages.length = 0;
  createApiKey.mockResolvedValue({ id: 'test-id' });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('waitForSecurityIndex', () => {
  test(`waits for the security request to succeed`, async () => {
    invalidateApiKey.mockImplementationOnce(() => Promise.reject(new Error('foo')));
    invalidateApiKey.mockImplementationOnce(() => Promise.resolve({}));

    const client = new Client({});

    await waitForSecurityIndex({ client, log });
    expect(invalidateApiKey).toHaveBeenCalledTimes(2);
    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " info waiting for ES cluster to bootstrap the security index",
        " warn waiting for ES cluster to bootstrap the security index, attempt 1 failed with: foo",
        " succ ES security index is ready",
      ]
    `);
  }, 10000);

  test(`rejects when 'readyTimeout' is exceeded`, async () => {
    invalidateApiKey.mockImplementation(() => Promise.reject(new Error('foo')));
    const client = new Client({});
    await expect(waitForSecurityIndex({ client, log, readyTimeout: 1000 })).rejects.toThrow(
      'ES cluster failed to bootstrap the security index with the 1 second timeout'
    );
  });
});
