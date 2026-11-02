/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as apiExpect } from '.';

describe('toHaveStatusCode', () => {
  it('should pass when status code matches', () => {
    // kbnClient interface (status)
    expect(() => apiExpect({ status: 200 }).toHaveStatusCode(200)).not.toThrow();
    // apiClient interface (statusCode)
    expect(() => apiExpect({ statusCode: 200 }).toHaveStatusCode(200)).not.toThrow();
  });

  it('should fail when status code does not match', () => {
    expect(() => apiExpect({ status: 404 }).toHaveStatusCode(200)).toThrow();
  });

  describe('oneOf option', () => {
    it('should pass when status is one of the expected codes', () => {
      expect(() =>
        apiExpect({ status: 404 }).toHaveStatusCode({ oneOf: [400, 404] })
      ).not.toThrow();
    });

    it('should fail when status is not one of the expected codes', () => {
      expect(() => apiExpect({ status: 500 }).toHaveStatusCode({ oneOf: [400, 404] })).toThrow();
    });
  });
});
