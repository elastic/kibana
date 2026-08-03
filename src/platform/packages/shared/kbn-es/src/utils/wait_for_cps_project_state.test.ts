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
import { waitForCpsProjectState } from './wait_for_cps_project_state';

jest.mock('@elastic/elasticsearch', () => {
  return {
    Client: jest.fn(),
  };
});

const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);

const search = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  jest.requireMock('@elastic/elasticsearch').Client.mockImplementation(() => ({ search }));
  log.indent(-log.getIndent());
  logWriter.messages.length = 0;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('waitForCpsProjectState', () => {
  test(`waits for the origin project state to be registered`, async () => {
    search.mockImplementationOnce(() =>
      Promise.reject(new Error('illegal_state_exception: No origin project state'))
    );
    search.mockImplementationOnce(() => Promise.resolve({}));

    const client = new Client({});

    await waitForCpsProjectState({ client, log });
    expect(search).toHaveBeenCalledTimes(2);
    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " [34minfo[39m waiting for ES to register the origin project CPS state",
        " [33mwarn[39m waiting for ES to register the origin project CPS state, attempt 1 failed with: illegal_state_exception: No origin project state",
        " [32msucc[39m ES origin project CPS state is ready",
      ]
    `);
  }, 10000);

  test(`rejects when 'readyTimeout' is exceeded`, async () => {
    search.mockImplementation(() =>
      Promise.reject(new Error('illegal_state_exception: No origin project state'))
    );
    const client = new Client({});
    await expect(waitForCpsProjectState({ client, log, readyTimeout: 1000 })).rejects.toThrow(
      'ES cluster failed to register the origin project CPS state within the 1 second timeout'
    );
  });
});
