/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRun, CreateRunResponse } from 'cypress-cloud/lib/api';
import { getAPIBaseUrl } from 'cypress-cloud/lib/httpClient/config';
import nock from 'nock';
import { printWarnings } from '../warnings';
import { createRunPayload, createRunResponse } from './fixtures/run';

jest.mock('../warnings');
jest.mock('cypress-cloud/lib/httpClient/config', () => ({
  getAPIBaseUrl: jest.fn().mockReturnValue('http://localhost:1234'),
}));

const apiMock = nock(getAPIBaseUrl()).persist();

describe('POST /runs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('print warnings when exist', async () => {
    const date = new Date().toISOString();
    const warnings = [
      {
        message: 'Message A',
        detailA: 'some detail',
        detailB: 'more detail',
      },
      {
        message: 'Message B',
        detailA: 'oh',
        detailB: date,
      },
    ];
    const responsePayload: CreateRunResponse = {
      ...createRunResponse,
      warnings,
    };
    apiMock.post('/runs').reply(200, responsePayload);
    await createRun(createRunPayload);
    expect(printWarnings).toHaveBeenCalledWith(warnings);
  });
});
