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
import { waitForCpsReady } from './wait_for_cps_ready';

jest.mock('@elastic/elasticsearch', () => {
  return {
    Client: jest.fn(),
  };
});

const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);

const request = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  jest
    .requireMock('@elastic/elasticsearch')
    .Client.mockImplementation(() => ({ transport: { request } }));
  log.indent(-log.getIndent());
  logWriter.messages.length = 0;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('waitForCpsReady', () => {
  test(`waits for the origin-routed request to succeed`, async () => {
    request.mockImplementationOnce(() =>
      Promise.reject(new Error('No origin project state for project default'))
    );
    request.mockImplementationOnce(() => Promise.resolve({}));

    const client = new Client({});

    await waitForCpsReady({ client, log });
    expect(request).toHaveBeenCalledTimes(2);
    // The probe must exercise the origin project routing resolution path.
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({ querystring: { project_routing: '_alias:_origin' } })
    );
    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " [34minfo[39m waiting for ES cluster to commit the CPS origin project state",
        " [33mwarn[39m waiting for ES cluster to commit the CPS origin project state, attempt 1 failed with: No origin project state for project default",
        " [32msucc[39m ES CPS origin project state is ready",
      ]
    `);
  }, 10000);

  test(`rejects when 'readyTimeout' is exceeded`, async () => {
    request.mockImplementation(() =>
      Promise.reject(new Error('No origin project state for project default'))
    );
    const client = new Client({});
    await expect(waitForCpsReady({ client, log, readyTimeout: 1000 })).rejects.toThrow(
      'ES cluster failed to commit the CPS origin project state within the 1 second timeout'
    );
  });
});
