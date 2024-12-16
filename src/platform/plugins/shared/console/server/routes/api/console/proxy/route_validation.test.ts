/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { routeValidationConfig } from './validation_config';

const { query } = routeValidationConfig;

describe('Proxy route validation', () => {
  describe('query', () => {
    describe('allows', () => {
      it('known http verb method and path value', () => {
        expect(query.validate({ method: 'GET', path: 'test' }));
      });
      it('mixed case http verbs', () => {
        expect(query.validate({ method: 'hEaD', path: 'test' }));
      });
    });
    describe('throws for', () => {
      it('empty query method value', () => {
        expect(() => {
          query.validate({ method: '', path: 'test' });
        }).toThrow('Method must be one of');
      });
      it('unknown method value', () => {
        expect(() => {
          query.validate({ method: 'abc', path: 'test' });
        }).toThrow('Method must be one of');
      });
      it('empty path value', () => {
        expect(() => {
          query.validate({ method: 'GET', path: '' });
        }).toThrow('Expected non-empty string');
      });
    });
  });
});
