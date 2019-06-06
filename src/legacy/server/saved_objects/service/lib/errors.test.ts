/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Boom from 'boom';

import {
  createBadRequestError,
  createEsAutoCreateIndexError,
  createGenericNotFoundError,
  createUnsupportedTypeError,
  decorateBadRequestError,
  decorateConflictError,
  decorateEsUnavailableError,
  decorateForbiddenError,
  decorateGeneralError,
  decorateNotAuthorizedError,
  isBadRequestError,
  isConflictError,
  isEsAutoCreateIndexError,
  isEsUnavailableError,
  isForbiddenError,
  isNotAuthorizedError,
  isNotFoundError,
} from './errors';

describe('savedObjectsClient/errorTypes', () => {
  describe('BadRequest error', () => {
    describe('createUnsupportedTypeError', () => {
      const errorObj = createUnsupportedTypeError('someType');

      it('should have the unsupported type message', () => {
        expect(errorObj).toHaveProperty(
          'message',
          "Unsupported saved object type: 'someType': Bad Request"
        );
      });

      it('has boom properties', () => {
        expect(errorObj.output.payload).toMatchObject({
          statusCode: 400,
          message: "Unsupported saved object type: 'someType': Bad Request",
          error: 'Bad Request',
        });
      });

      it("should be identified by 'isBadRequestError' method", () => {
        expect(isBadRequestError(errorObj)).toBeTruthy();
      });
    });

    describe('createBadRequestError', () => {
      const errorObj = createBadRequestError('test reason message');
      it('should create an appropriately structured error object', () => {
        expect(errorObj.message).toEqual('test reason message: Bad Request');
      });

      it("should be identified by 'isBadRequestError' method", () => {
        expect(isBadRequestError(errorObj)).toBeTruthy();
      });

      it('has boom properties', () => {
        expect(errorObj.output.payload).toMatchObject({
          statusCode: 400,
          message: 'test reason message: Bad Request',
          error: 'Bad Request',
        });
      });
    });

    describe('decorateBadRequestError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateBadRequestError(error)).toBe(error);
      });

      it('makes the error identifiable as a BadRequest error', () => {
        const error = new Error();
        expect(isBadRequestError(error)).toBe(false);
        decorateBadRequestError(error);
        expect(isBadRequestError(error)).toBe(true);
      });

      it('adds boom properties', () => {
        const error = decorateBadRequestError(new Error());
        expect(typeof error.output).toBe('object');
        expect(error.output.statusCode).toBe(400);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateBadRequestError(error);
        expect(error.output.statusCode).toBe(404);
      });

      describe('error.output', () => {
        it('defaults to message of error', () => {
          const error = decorateBadRequestError(new Error('foobar'));
          expect(error.output.payload).toHaveProperty('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = decorateBadRequestError(new Error('foobar'), 'biz');
          expect(error.output.payload).toHaveProperty('message', 'biz: foobar');
        });
        it('sets statusCode to 400', () => {
          const error = decorateBadRequestError(new Error('foo'));
          expect(error.output).toHaveProperty('statusCode', 400);
        });
      });
    });
  });
  describe('NotAuthorized error', () => {
    describe('decorateNotAuthorizedError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateNotAuthorizedError(error)).toBe(error);
      });

      it('makes the error identifiable as a NotAuthorized error', () => {
        const error = new Error();
        expect(isNotAuthorizedError(error)).toBe(false);
        decorateNotAuthorizedError(error);
        expect(isNotAuthorizedError(error)).toBe(true);
      });

      it('adds boom properties', () => {
        const error = decorateNotAuthorizedError(new Error());
        expect(typeof error.output).toBe('object');
        expect(error.output.statusCode).toBe(401);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateNotAuthorizedError(error);
        expect(error.output.statusCode).toBe(404);
      });

      describe('error.output', () => {
        it('defaults to message of error', () => {
          const error = decorateNotAuthorizedError(new Error('foobar'));
          expect(error.output.payload).toHaveProperty('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = decorateNotAuthorizedError(new Error('foobar'), 'biz');
          expect(error.output.payload).toHaveProperty('message', 'biz: foobar');
        });
        it('sets statusCode to 401', () => {
          const error = decorateNotAuthorizedError(new Error('foo'));
          expect(error.output).toHaveProperty('statusCode', 401);
        });
      });
    });
  });
  describe('Forbidden error', () => {
    describe('decorateForbiddenError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateForbiddenError(error)).toBe(error);
      });

      it('makes the error identifiable as a Forbidden error', () => {
        const error = new Error();
        expect(isForbiddenError(error)).toBe(false);
        decorateForbiddenError(error);
        expect(isForbiddenError(error)).toBe(true);
      });

      it('adds boom properties', () => {
        const error = decorateForbiddenError(new Error());
        expect(typeof error.output).toBe('object');
        expect(error.output.statusCode).toBe(403);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateForbiddenError(error);
        expect(error.output.statusCode).toBe(404);
      });

      describe('error.output', () => {
        it('defaults to message of error', () => {
          const error = decorateForbiddenError(new Error('foobar'));
          expect(error.output.payload).toHaveProperty('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = decorateForbiddenError(new Error('foobar'), 'biz');
          expect(error.output.payload).toHaveProperty('message', 'biz: foobar');
        });
        it('sets statusCode to 403', () => {
          const error = decorateForbiddenError(new Error('foo'));
          expect(error.output).toHaveProperty('statusCode', 403);
        });
      });
    });
  });
  describe('NotFound error', () => {
    describe('createGenericNotFoundError', () => {
      it('makes an error identifiable as a NotFound error', () => {
        const error = createGenericNotFoundError();
        expect(isNotFoundError(error)).toBe(true);
      });

      it('is a boom error, has boom properties', () => {
        const error = createGenericNotFoundError();
        expect(error).toHaveProperty('isBoom');
        expect(typeof error.output).toBe('object');
        expect(error.output.statusCode).toBe(404);
      });

      describe('error.output', () => {
        it('Uses "Not Found" message', () => {
          const error = createGenericNotFoundError();
          expect(error.output.payload).toHaveProperty('message', 'Not Found');
        });
        it('sets statusCode to 404', () => {
          const error = createGenericNotFoundError();
          expect(error.output).toHaveProperty('statusCode', 404);
        });
      });
    });
  });
  describe('Conflict error', () => {
    describe('decorateConflictError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateConflictError(error)).toBe(error);
      });

      it('makes the error identifiable as a Conflict error', () => {
        const error = new Error();
        expect(isConflictError(error)).toBe(false);
        decorateConflictError(error);
        expect(isConflictError(error)).toBe(true);
      });

      it('adds boom properties', () => {
        const error = decorateConflictError(new Error());
        expect(typeof error.output).toBe('object');
        expect(error.output.statusCode).toBe(409);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateConflictError(error);
        expect(error.output.statusCode).toBe(404);
      });

      describe('error.output', () => {
        it('defaults to message of error', () => {
          const error = decorateConflictError(new Error('foobar'));
          expect(error.output.payload).toHaveProperty('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = decorateConflictError(new Error('foobar'), 'biz');
          expect(error.output.payload).toHaveProperty('message', 'biz: foobar');
        });
        it('sets statusCode to 409', () => {
          const error = decorateConflictError(new Error('foo'));
          expect(error.output).toHaveProperty('statusCode', 409);
        });
      });
    });
  });
  describe('EsUnavailable error', () => {
    describe('decorateEsUnavailableError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateEsUnavailableError(error)).toBe(error);
      });

      it('makes the error identifiable as a EsUnavailable error', () => {
        const error = new Error();
        expect(isEsUnavailableError(error)).toBe(false);
        decorateEsUnavailableError(error);
        expect(isEsUnavailableError(error)).toBe(true);
      });

      it('adds boom properties', () => {
        const error = decorateEsUnavailableError(new Error());
        expect(typeof error.output).toBe('object');
        expect(error.output.statusCode).toBe(503);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateEsUnavailableError(error);
        expect(error.output.statusCode).toBe(404);
      });

      describe('error.output', () => {
        it('defaults to message of error', () => {
          const error = decorateEsUnavailableError(new Error('foobar'));
          expect(error.output.payload).toHaveProperty('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = decorateEsUnavailableError(new Error('foobar'), 'biz');
          expect(error.output.payload).toHaveProperty('message', 'biz: foobar');
        });
        it('sets statusCode to 503', () => {
          const error = decorateEsUnavailableError(new Error('foo'));
          expect(error.output).toHaveProperty('statusCode', 503);
        });
      });
    });
  });
  describe('General error', () => {
    describe('decorateGeneralError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateGeneralError(error)).toBe(error);
      });

      it('adds boom properties', () => {
        const error = decorateGeneralError(new Error());
        expect(typeof error.output).toBe('object');
        expect(error.output.statusCode).toBe(500);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateGeneralError(error);
        expect(error.output.statusCode).toBe(404);
      });

      describe('error.output', () => {
        it('ignores error message', () => {
          const error = decorateGeneralError(new Error('foobar'));
          expect(error.output.payload.message).toMatch(/internal server error/i);
        });
        it('sets statusCode to 500', () => {
          const error = decorateGeneralError(new Error('foo'));
          expect(error.output).toHaveProperty('statusCode', 500);
        });
      });
    });
  });

  describe('EsAutoCreateIndex error', () => {
    describe('createEsAutoCreateIndexError', () => {
      it('does not take an error argument', () => {
        const error = new Error();
        // @ts-ignore
        expect(createEsAutoCreateIndexError(error)).not.toBe(error);
      });

      it('returns a new Error', () => {
        expect(createEsAutoCreateIndexError()).toBeInstanceOf(Error);
      });

      it('makes errors identifiable as EsAutoCreateIndex errors', () => {
        expect(isEsAutoCreateIndexError(createEsAutoCreateIndexError())).toBe(true);
      });

      it('returns a boom error', () => {
        const error = createEsAutoCreateIndexError();
        expect(error).toHaveProperty('isBoom');
        expect(typeof error.output).toBe('object');
        expect(error.output.statusCode).toBe(503);
      });

      describe('error.output', () => {
        it('uses "Automatic index creation failed" message', () => {
          const error = createEsAutoCreateIndexError();
          expect(error.output.payload).toHaveProperty('message', 'Automatic index creation failed');
        });
        it('sets statusCode to 503', () => {
          const error = createEsAutoCreateIndexError();
          expect(error.output).toHaveProperty('statusCode', 503);
        });
      });
    });
  });
});
