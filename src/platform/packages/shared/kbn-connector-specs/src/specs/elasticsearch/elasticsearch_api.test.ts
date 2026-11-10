/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { callEsApi, EsApiError } from './elasticsearch_api';

describe('callEsApi errors', () => {
  it.each([
    {
      response: {
        status: 403,
        data: { error: { type: 'security_exception', reason: 'missing privileges' } },
      },
      message: 'Elasticsearch error (security_exception): missing privileges',
    },
    {
      response: { status: 403, data: { error: 'Forbidden' } },
      message: 'Elasticsearch error: Forbidden',
    },
    {
      response: { status: 401 },
      message: 'Elasticsearch authentication failed. Check your API key or username/password.',
    },
    {
      response: { status: 403 },
      message:
        'Elasticsearch access denied. The credentials lack the required privileges for this operation.',
    },
    {
      response: { status: 500, statusText: 'Internal Server Error' },
      message: 'Elasticsearch request failed: Internal Server Error',
    },
  ])('preserves HTTP status and error formatting: %j', async ({ response, message }) => {
    const ctx = {
      config: { url: 'https://elasticsearch.example.com' },
      client: { request: jest.fn().mockRejectedValue({ response }) },
    } as unknown as ActionContext;

    const result = callEsApi(ctx, 'GET', '/');

    await expect(result).rejects.toBeInstanceOf(EsApiError);
    await expect(result).rejects.toMatchObject({ statusCode: response.status, message });
  });

  it('does not assign an HTTP status to a network error', async () => {
    const ctx = {
      config: { url: 'https://elasticsearch.example.com' },
      client: { request: jest.fn().mockRejectedValue(new Error('Network Error')) },
    } as unknown as ActionContext;

    const result = callEsApi(ctx, 'GET', '/');

    await expect(result).rejects.toBeInstanceOf(EsApiError);
    await expect(result).rejects.toMatchObject({
      statusCode: undefined,
      message: 'Elasticsearch request failed: Network Error',
    });
  });
});
