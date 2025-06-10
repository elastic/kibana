/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encodePath } from './encode_path';

describe('encodePath', () => {
  it('should return the same path if no pathParams are provided', () => {
    const path = '/services/{serviceName}/transactions';
    const result = encodePath(path);
    expect(result).toBe(path);
  });

  it('should encode path parameters correctly', () => {
    const path = '/services/{serviceName}/transactions';
    const pathParams = { serviceName: 'my/service' };
    const result = encodePath(path, pathParams);
    expect(result).toBe('/services/my%2Fservice/transactions');
  });

  it('should handle two matching path parameters', () => {
    const path = '/services/{serviceName}/transactions/{transactionId}';
    const pathParams = { serviceName: 'my/service', transactionId: '123/456' };
    const result = encodePath(path, pathParams);
    expect(result).toBe('/services/my%2Fservice/transactions/123%2F456');
  });

  it('should handle multiple path parameters', () => {
    const path = '/services/{serviceName}/transactions/{transactionId}/details/{detailId}';
    const pathParams = {
      serviceName: 'my/service',
      transactionId: '123/456',
      detailId: '111/222/333',
    };
    const result = encodePath(path, pathParams);
    expect(result).toBe('/services/my%2Fservice/transactions/123%2F456/details/111%2F222%2F333');
  });

  it('should return the same path if no matching parameters are found', () => {
    const path = '/services/{serviceName}/transactions';
    const pathParams = { otherParam: 'value' };
    const result = encodePath(path, pathParams);
    expect(result).toBe(path);
  });

  it('should handle a path without placeholders', () => {
    const path = '/services/transactions';
    const pathParams = { serviceName: 'my/service' };
    const result = encodePath(path, pathParams);
    expect(result).toBe('/services/transactions');
  });
});
