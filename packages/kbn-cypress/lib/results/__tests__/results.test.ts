/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getInstanceResultPayload, getInstanceTestsPayload, getTestAttempt } from '../results';
import configException from './fixtures/payloads/cypressResult/exception/config.json';
import rawResultException from './fixtures/payloads/cypressResult/exception/results.json';

describe('exception in cypress result', () => {
  it('should populate instance tests payload when exception', () => {
    expect(getInstanceTestsPayload(rawResultException, configException)).toMatchObject({
      config: configException,
      tests: [
        {
          displayError: 'Oops...we found an error preparing this test file:',
          state: 'failed',
          hooks: [],
          clientId: 'r0',
          body: '',
          attempts: [
            getTestAttempt({
              state: 'failed',
              duration: 0,
              error: {
                name: 'Error',
                message: rawResultException.error.split('\n')[0],
                stack: rawResultException.error,
              },
              screenshots: [],
              startedAt: rawResultException.stats.startedAt,
              videoTimestamp: 0,
            }),
          ],
        },
      ],
    });
  });
  it('should populate instances results payload when exception', () => {
    expect(getInstanceResultPayload(rawResultException)).toMatchObject({
      tests: [
        {
          displayError: 'Oops...we found an error preparing this test file:',
          state: 'failed',
          hooks: [],
          clientId: 'r0',
          body: '',
          attempts: [
            getTestAttempt({
              state: 'failed',
              duration: 0,
              error: {
                name: 'Error',
                message: rawResultException.error.split('\n')[0],
                stack: rawResultException.error,
              },
              screenshots: [],
              startedAt: rawResultException.stats.startedAt,
              videoTimestamp: 0,
            }),
          ],
        },
      ],
    });
  });
});
