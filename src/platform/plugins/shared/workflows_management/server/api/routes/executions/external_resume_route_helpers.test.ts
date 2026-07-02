/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { handleExternalResumeError } from './external_resume_route_helpers';
import { ExternalResumeError } from '../../external_resume/external_resume_error';

describe('handleExternalResumeError', () => {
  const response = {
    custom: jest.fn((options) => options),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns curated ExternalResumeError messages with their status codes', () => {
    const result = handleExternalResumeError(
      response as any,
      new ExternalResumeError('Invalid external resume API key', 401)
    );

    expect(result).toMatchObject({
      statusCode: 401,
      body: expect.stringContaining('Invalid external resume API key'),
    });
  });

  it('returns a generic 400 HTML page for unexpected errors', () => {
    const logger = loggingSystemMock.create().get();

    const result = handleExternalResumeError(
      response as any,
      new Error('index_not_found_exception [.workflows-step-executions]'),
      logger
    );

    expect(result).toMatchObject({
      statusCode: 400,
      body: expect.stringContaining('Unable to submit response'),
    });
    expect(result.body).not.toContain('index_not_found_exception');
    expect(logger.debug).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
