/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { z } from '@kbn/zod';
import { validateAsCodeRequest } from './validate_as_code_request';

describe('validateAsCodeRequest', () => {
  const body = z.object({
    page: z.number().min(1),
    size: z.union([z.number(), z.literal('auto')]),
  });
  const config = {
    request: { body },
    response: { 400: { description: 'Invalid request' } },
  };
  const request = httpServerMock.createKibanaRequest();

  it('preserves request and response schemas for Core validation and OAS', () => {
    const validate = validateAsCodeRequest(config);

    expect(validate.request).toBe(config.request);
    expect(validate.response).toBe(config.response);
    expect(config).not.toHaveProperty('onRequestValidationError');
  });

  it('returns a formatted message and all original validation issues', () => {
    const parsed = body.safeParse({ page: 0, size: true });
    if (parsed.success) throw new Error('Expected invalid input');
    const response = httpServerMock.createResponseFactory();

    validateAsCodeRequest(config).onRequestValidationError(
      { source: 'body', message: '[request body]: Invalid input', rawError: parsed.error },
      request,
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message:
          '✖ Too small: expected number to be >=1\n  → at page\n' +
          '✖ Invalid input: expected number or "auto"\n  → at size',
        attributes: { issues: parsed.error.issues },
      },
    });
  });

  it('preserves the Core message for errors from other validators', () => {
    const response = httpServerMock.createResponseFactory();
    const message = '[request query]: Invalid page';

    validateAsCodeRequest(config).onRequestValidationError(
      { source: 'query', message, rawError: new Error('Internal diagnostic') },
      request,
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith({ body: { message } });
  });
});
