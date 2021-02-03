/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Boom from '@hapi/boom';

import { LegacyElasticsearchErrorHelpers } from './errors';

describe('ElasticsearchErrorHelpers', () => {
  describe('NotAuthorized error', () => {
    describe('decorateNotAuthorizedError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(error)).toBe(error);
      });

      it('makes the error identifiable as a NotAuthorized error', () => {
        const error = new Error();
        expect(LegacyElasticsearchErrorHelpers.isNotAuthorizedError(error)).toBe(false);
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(error);
        expect(LegacyElasticsearchErrorHelpers.isNotAuthorizedError(error)).toBe(true);
      });

      it('adds boom properties', () => {
        const error = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
        expect(typeof error.output).toBe('object');
        expect(error.output.statusCode).toBe(401);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(error);
        expect(error.output.statusCode).toBe(404);
      });

      describe('error.output', () => {
        it('defaults to message of error', () => {
          const error = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(
            new Error('foobar')
          );
          expect(error.output.payload).toHaveProperty('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(
            new Error('foobar'),
            'biz'
          );
          expect(error.output.payload).toHaveProperty('message', 'biz: foobar');
        });
        it('sets statusCode to 401', () => {
          const error = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(
            new Error('foo')
          );
          expect(error.output).toHaveProperty('statusCode', 401);
        });
      });
    });
  });
});
