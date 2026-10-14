/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { z } from '@kbn/zod';
import { createOnRequestValidationError } from './on_request_validation_error';

describe('createOnRequestValidationError', () => {
  const body = z.object({
    page: z.number().min(1),
    size: z.union([z.number(), z.literal('auto')]),
  });
  const request = httpServerMock.createKibanaRequest({ method: 'post', path: '/api/sessions' });
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  it('returns and logs only the formatted message without attributes or the Core prefix', () => {
    const parsed = body.safeParse({ page: 0, size: true });
    if (parsed.success) throw new Error('Expected invalid input');
    const response = httpServerMock.createResponseFactory();
    const message =
      '✖ Too small: expected number to be >=1\n  → at page\n' +
      '✖ Invalid input: expected number or "auto"\n  → at size';

    createOnRequestValidationError(logger)(
      { source: 'body', message: '[request body]: Invalid input', rawError: parsed.error },
      request,
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith({ body: { message } });
    expect(logger.warn).toHaveBeenCalledWith(`POST /api/sessions: ${message}`);
  });

  it('preserves and logs the Core message for errors from other validators', () => {
    const response = httpServerMock.createResponseFactory();
    const message = '[request query]: Invalid page';

    createOnRequestValidationError(logger)(
      { source: 'query', message, rawError: new Error('Internal diagnostic') },
      request,
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith({ body: { message } });
    expect(logger.warn).toHaveBeenCalledWith(`POST /api/sessions: ${message}`);
  });
});
