import expect from 'expect.js';
import Boom from 'boom';

import {
  decorateBadRequestError,
  isBadRequestError,
  decorateNotAuthorizedError,
  isNotAuthorizedError,
  decorateForbiddenError,
  isForbiddenError,
  createGenericNotFoundError,
  isNotFoundError,
  decorateConflictError,
  isConflictError,
  decorateEsUnavailableError,
  isEsUnavailableError,
  decorateGeneralError,
  isEsAutoCreateIndexError,
  createEsAutoCreateIndexError,
} from '../errors';

describe('savedObjectsClient/errorTypes', () => {
  describe('BadRequest error', () => {
    describe('decorateBadRequestError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateBadRequestError(error)).to.be(error);
      });

      it('makes the error identifiable as a BadRequest error', () => {
        const error = new Error();
        expect(isBadRequestError(error)).to.be(false);
        decorateBadRequestError(error);
        expect(isBadRequestError(error)).to.be(true);
      });

      it('adds boom properties', () => {
        const error = decorateBadRequestError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(400);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateBadRequestError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('defaults to message of erorr', () => {
          const error = decorateBadRequestError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = decorateBadRequestError(new Error('foobar'), 'biz');
          expect(error.output.payload).to.have.property('message', 'biz: foobar');
        });
        it('sets statusCode to 400', () => {
          const error = decorateBadRequestError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 400);
        });
      });
    });
  });
  describe('NotAuthorized error', () => {
    describe('decorateNotAuthorizedError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateNotAuthorizedError(error)).to.be(error);
      });

      it('makes the error identifiable as a NotAuthorized error', () => {
        const error = new Error();
        expect(isNotAuthorizedError(error)).to.be(false);
        decorateNotAuthorizedError(error);
        expect(isNotAuthorizedError(error)).to.be(true);
      });

      it('adds boom properties', () => {
        const error = decorateNotAuthorizedError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(401);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateNotAuthorizedError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('defaults to message of erorr', () => {
          const error = decorateNotAuthorizedError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = decorateNotAuthorizedError(new Error('foobar'), 'biz');
          expect(error.output.payload).to.have.property('message', 'biz: foobar');
        });
        it('sets statusCode to 401', () => {
          const error = decorateNotAuthorizedError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 401);
        });
      });
    });
  });
  describe('Forbidden error', () => {
    describe('decorateForbiddenError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateForbiddenError(error)).to.be(error);
      });

      it('makes the error identifiable as a Forbidden error', () => {
        const error = new Error();
        expect(isForbiddenError(error)).to.be(false);
        decorateForbiddenError(error);
        expect(isForbiddenError(error)).to.be(true);
      });

      it('adds boom properties', () => {
        const error = decorateForbiddenError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(403);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateForbiddenError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('defaults to message of erorr', () => {
          const error = decorateForbiddenError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = decorateForbiddenError(new Error('foobar'), 'biz');
          expect(error.output.payload).to.have.property('message', 'biz: foobar');
        });
        it('sets statusCode to 403', () => {
          const error = decorateForbiddenError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 403);
        });
      });
    });
  });
  describe('NotFound error', () => {
    describe('createGenericNotFoundError', () => {
      it('makes an error identifiable as a NotFound error', () => {
        const error = createGenericNotFoundError();
        expect(isNotFoundError(error)).to.be(true);
      });

      it('is a boom error, has boom properties', () => {
        const error = createGenericNotFoundError();
        expect(error).to.have.property('isBoom', true);
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('Uses "Not Found" message', () => {
          const error = createGenericNotFoundError();
          expect(error.output.payload).to.have.property('message', 'Not Found');
        });
        it('sets statusCode to 404', () => {
          const error = createGenericNotFoundError();
          expect(error.output).to.have.property('statusCode', 404);
        });
      });
    });
  });
  describe('Conflict error', () => {
    describe('decorateConflictError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateConflictError(error)).to.be(error);
      });

      it('makes the error identifiable as a Conflict error', () => {
        const error = new Error();
        expect(isConflictError(error)).to.be(false);
        decorateConflictError(error);
        expect(isConflictError(error)).to.be(true);
      });

      it('adds boom properties', () => {
        const error = decorateConflictError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(409);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateConflictError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('defaults to message of erorr', () => {
          const error = decorateConflictError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = decorateConflictError(new Error('foobar'), 'biz');
          expect(error.output.payload).to.have.property('message', 'biz: foobar');
        });
        it('sets statusCode to 409', () => {
          const error = decorateConflictError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 409);
        });
      });
    });
  });
  describe('EsUnavailable error', () => {
    describe('decorateEsUnavailableError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateEsUnavailableError(error)).to.be(error);
      });

      it('makes the error identifiable as a EsUnavailable error', () => {
        const error = new Error();
        expect(isEsUnavailableError(error)).to.be(false);
        decorateEsUnavailableError(error);
        expect(isEsUnavailableError(error)).to.be(true);
      });

      it('adds boom properties', () => {
        const error = decorateEsUnavailableError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(503);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateEsUnavailableError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('defaults to message of erorr', () => {
          const error = decorateEsUnavailableError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = decorateEsUnavailableError(new Error('foobar'), 'biz');
          expect(error.output.payload).to.have.property('message', 'biz: foobar');
        });
        it('sets statusCode to 503', () => {
          const error = decorateEsUnavailableError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 503);
        });
      });
    });
  });
  describe('General error', () => {
    describe('decorateGeneralError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(decorateGeneralError(error)).to.be(error);
      });

      it('adds boom properties', () => {
        const error = decorateGeneralError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(500);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        decorateGeneralError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('ignores error message', () => {
          const error = decorateGeneralError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message').match(/internal server error/i);
        });
        it('sets statusCode to 500', () => {
          const error = decorateGeneralError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 500);
        });
      });
    });
  });

  describe('EsAutoCreateIndex error', () => {
    describe('createEsAutoCreateIndexError', () => {
      it('does not take an error argument', () => {
        const error = new Error();
        expect(createEsAutoCreateIndexError(error)).to.not.be(error);
      });

      it('returns a new Error', () => {
        expect(createEsAutoCreateIndexError()).to.be.a(Error);
      });

      it('makes errors identifiable as EsAutoCreateIndex errors', () => {
        expect(isEsAutoCreateIndexError(createEsAutoCreateIndexError())).to.be(true);
      });

      it('returns a boom error', () => {
        const error = createEsAutoCreateIndexError();
        expect(error).to.have.property('isBoom', true);
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(503);
      });

      describe('error.output', () => {
        it('uses "Automatic index creation failed" message', () => {
          const error = createEsAutoCreateIndexError();
          expect(error.output.payload).to.have.property('message', 'Automatic index creation failed');
        });
        it('sets statusCode to 503', () => {
          const error = createEsAutoCreateIndexError();
          expect(error.output).to.have.property('statusCode', 503);
        });
      });
    });
  });
});
