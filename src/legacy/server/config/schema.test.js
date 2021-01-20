/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import schemaProvider from './schema';
import Joi from 'joi';

describe('Config schema', function () {
  let schema;
  beforeEach(async () => (schema = await schemaProvider()));

  function validate(data, options) {
    return Joi.validate(data, schema, options);
  }

  describe('server', function () {
    it('everything is optional', function () {
      const { error } = validate({});
      expect(error).toBe(null);
    });

    describe('basePath', function () {
      it('accepts empty strings', function () {
        const { error, value } = validate({ server: { basePath: '' } });
        expect(error).toBe(null);
        expect(value.server.basePath).toBe('');
      });

      it('accepts strings with leading slashes', function () {
        const { error, value } = validate({ server: { basePath: '/path' } });
        expect(error).toBe(null);
        expect(value.server.basePath).toBe('/path');
      });

      it('rejects strings with trailing slashes', function () {
        const { error } = validate({ server: { basePath: '/path/' } });
        expect(error).toHaveProperty('details');
        expect(error.details[0]).toHaveProperty('path', ['server', 'basePath']);
      });

      it('rejects strings without leading slashes', function () {
        const { error } = validate({ server: { basePath: 'path' } });
        expect(error).toHaveProperty('details');
        expect(error.details[0]).toHaveProperty('path', ['server', 'basePath']);
      });

      it('rejects things that are not strings', function () {
        for (const value of [1, true, {}, [], /foo/]) {
          const { error } = validate({ server: { basePath: value } });
          expect(error).toHaveProperty('details');
          expect(error.details[0]).toHaveProperty('path', ['server', 'basePath']);
        }
      });
    });

    describe('rewriteBasePath', function () {
      it('defaults to false', () => {
        const { error, value } = validate({});
        expect(error).toBe(null);
        expect(value.server.rewriteBasePath).toBe(false);
      });

      it('accepts false', function () {
        const { error, value } = validate({ server: { rewriteBasePath: false } });
        expect(error).toBe(null);
        expect(value.server.rewriteBasePath).toBe(false);
      });

      it('accepts true if basePath set', function () {
        const { error, value } = validate({ server: { basePath: '/foo', rewriteBasePath: true } });
        expect(error).toBe(null);
        expect(value.server.rewriteBasePath).toBe(true);
      });

      it('rejects true if basePath not set', function () {
        const { error } = validate({ server: { rewriteBasePath: true } });
        expect(error).toHaveProperty('details');
        expect(error.details[0]).toHaveProperty('path', ['server', 'rewriteBasePath']);
      });

      it('rejects strings', function () {
        const { error } = validate({ server: { rewriteBasePath: 'foo' } });
        expect(error).toHaveProperty('details');
        expect(error.details[0]).toHaveProperty('path', ['server', 'rewriteBasePath']);
      });
    });
  });
});
