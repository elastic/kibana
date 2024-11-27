/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatRequest } from './format_request';

describe('formatRequest', () => {
  it('should return the correct path if the optional or required param is provided', () => {
    const pathParams = { param: 'testParam' };
    const resultOptionalEnd = formatRequest('GET /api/endpoint/{param?}', pathParams);
    expect(resultOptionalEnd.pathname).toBe('/api/endpoint/testParam');
    const resultRequiredEnd = formatRequest('GET /api/endpoint/{param}', pathParams);
    expect(resultRequiredEnd.pathname).toBe('/api/endpoint/testParam');
  });
  it('should return the correct path if the only the required param is provided', () => {
    const resultEnd = formatRequest('GET /api/endpoint/{id}/some/{opt?}', { id: 123 });
    expect(resultEnd.pathname).toBe('/api/endpoint/123/some');
  });
  it('should return the correct path if the only an optional param is provided', () => {
    const resultOptEnd = formatRequest('GET /api/endpoint/{id?}', { id: 123 });
    expect(resultOptEnd.pathname).toBe('/api/endpoint/123');
  });
  it('should return the correct path if the optional param is not provided', () => {
    const pathParams = {};
    const resultEnd = formatRequest('GET /api/endpoint/{pathParamReq?}', pathParams);
    expect(resultEnd.pathname).toBe('/api/endpoint');
  });
  it('should return the correct path if the optional param is not provided and the required is', () => {
    const pathParams = { req: 'required' };
    const resultEnd = formatRequest('GET /api/endpoint/{req}/{op?}', pathParams);
    expect(resultEnd.pathname).toBe('/api/endpoint/required');
  });
});
