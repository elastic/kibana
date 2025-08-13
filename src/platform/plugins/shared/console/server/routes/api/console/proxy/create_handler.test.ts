/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { routeValidationConfig } from './validation_config';

describe('Console Proxy Route - Crete Handler', () => {
  describe('route validation config', () => {
    it('should accept host parameter in query schema', () => {
      const validQuery = {
        method: 'GET',
        path: '/_cat/indices',
        host: 'http://custom-host:9200',
      };

      // This should not throw
      expect(() => routeValidationConfig.query.validate(validQuery)).not.toThrow();
    });

    it('should accept query without host parameter', () => {
      const validQuery = {
        method: 'GET',
        path: '/_cat/indices',
      };

      // This should not throw
      expect(() => routeValidationConfig.query.validate(validQuery)).not.toThrow();
    });

    it('should accept host parameter alongside other query parameters', () => {
      const validQuery = {
        method: 'POST',
        path: '/test-index/_doc',
        host: 'http://custom-host:9200',
        withProductOrigin: true,
      };

      // This should not throw
      expect(() => routeValidationConfig.query.validate(validQuery)).not.toThrow();
    });

    it('should validate the host parameter as optional string', () => {
      const queryWithEmptyHost = {
        method: 'GET',
        path: '/_cat/indices',
        host: '',
      };

      // Empty string should be valid (it's a string)
      expect(() => routeValidationConfig.query.validate(queryWithEmptyHost)).not.toThrow();
    });
  });
});
