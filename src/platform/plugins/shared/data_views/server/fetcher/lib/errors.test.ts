/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { errors as esErrors } from '@elastic/elasticsearch';

import {
  isEsIndexNotFoundError,
  createNoMatchingIndicesError,
  isNoMatchingIndicesError,
  convertEsError,
} from './errors';

// Mirrors the live ES "index_not_found_exception" payload shape so the
// behaviour stays in sync with what `@elastic/elasticsearch` throws.
const buildIndexNotFoundError = () =>
  new esErrors.ResponseError({
    statusCode: 404,
    body: {
      error: {
        type: 'index_not_found_exception',
        reason: 'no such index [SHOULD NOT EXIST]',
        index: 'SHOULD NOT EXIST',
        'resource.id': 'SHOULD NOT EXIST',
        'resource.type': 'index_or_alias',
      },
    },
  } as ConstructorParameters<typeof esErrors.ResponseError>[0]);

const buildDocNotFoundError = () =>
  new esErrors.ResponseError({
    statusCode: 404,
    body: {
      _index: 'basic_index',
      _id: '1234',
      found: false,
    },
  } as ConstructorParameters<typeof esErrors.ResponseError>[0]);

describe('index_patterns/* error handler', () => {
  describe('isEsIndexNotFoundError()', () => {
    it('identifies index not found errors', () => {
      expect(isEsIndexNotFoundError(buildIndexNotFoundError())).toBe(true);
    });

    it('rejects doc not found errors', () => {
      expect(isEsIndexNotFoundError(buildDocNotFoundError())).toBe(false);
    });
  });

  describe('createNoMatchingIndicesError()', () => {
    it('returns a boom error', () => {
      const error = createNoMatchingIndicesError('foo*') as Boom.Boom;
      expect(error.isBoom).toBe(true);
    });

    it('sets output code to "no_matching_indices"', () => {
      const error = createNoMatchingIndicesError('foo*') as Boom.Boom;
      expect(error.output.payload).toHaveProperty('code', 'no_matching_indices');
    });
  });

  describe('isNoMatchingIndicesError()', () => {
    it('returns true for errors from createNoMatchingIndicesError()', () => {
      expect(isNoMatchingIndicesError(createNoMatchingIndicesError('foo*'))).toBe(true);
    });

    it('returns false for indexNotFoundError', () => {
      expect(isNoMatchingIndicesError(buildIndexNotFoundError())).toBe(false);
    });

    it('returns false for docNotFoundError', () => {
      expect(isNoMatchingIndicesError(buildDocNotFoundError())).toBe(false);
    });
  });

  describe('convertEsError()', () => {
    const indices = ['foo', 'bar'];

    it('converts indexNotFoundErrors into NoMatchingIndices errors', () => {
      const converted = convertEsError(indices, buildIndexNotFoundError());
      expect(isNoMatchingIndicesError(converted)).toBe(true);
    });

    it('wraps other errors in Boom', () => {
      const error = new esErrors.ResponseError({
        statusCode: 403,
        body: {
          root_cause: [
            {
              type: 'security_exception',
              reason: 'action [indices:data/read/field_caps] is unauthorized for user [standard]',
            },
          ],
          type: 'security_exception',
          reason: 'action [indices:data/read/field_caps] is unauthorized for user [standard]',
        },
      } as ConstructorParameters<typeof esErrors.ResponseError>[0]);

      expect(error).not.toHaveProperty('isBoom');
      const converted = convertEsError(indices, error) as Boom.Boom;
      expect(converted).toHaveProperty('isBoom');
      expect(converted.output.statusCode).toBe(403);
    });

    it('handles errors that are already Boom errors', () => {
      const error = new Error() as Error & { statusCode?: number };
      error.statusCode = 401;
      const boomError = Boom.boomify(error, { statusCode: error.statusCode });

      const converted = convertEsError(indices, boomError) as Boom.Boom;

      expect(converted.output.statusCode).toBe(401);
    });

    it('preserves headers from Boom errors', () => {
      const error = new Error() as Error & { statusCode?: number };
      error.statusCode = 401;
      const boomError = Boom.boomify(error, { statusCode: error.statusCode });
      const wwwAuthenticate = 'Basic realm="Authorization Required"';
      boomError.output.headers['WWW-Authenticate'] = wwwAuthenticate;
      const converted = convertEsError(indices, boomError) as Boom.Boom;

      expect(converted.output.headers['WWW-Authenticate']).toBe(wwwAuthenticate);
    });
  });
});
