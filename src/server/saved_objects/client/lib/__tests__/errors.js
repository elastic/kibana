import expect from 'expect.js';
import Boom from 'boom';

import {
  wrapBadRequestError,
  isBadRequestError,
  wrapNotAuthorizedError,
  isNotAuthorizedError,
  wrapForbiddenError,
  isForbiddenError,
  wrapNotFoundError,
  isNotFoundError,
  wrapConflictError,
  isConflictError,
  wrapEsUnavailableError,
  isEsUnavailableError,
  wrapGeneralError,
} from '../errors';

describe('savedObjectsClient/errorTypes', () => {
  describe('BadRequest error', () => {
    describe('wrapBadRequestError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(wrapBadRequestError(error)).to.be(error);
      });

      it('makes the error identifiable as a BadRequest error', () => {
        const error = new Error();
        expect(isBadRequestError(error)).to.be(false);
        wrapBadRequestError(error);
        expect(isBadRequestError(error)).to.be(true);
      });

      it('adds boom properties', () => {
        const error = wrapBadRequestError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(400);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        wrapBadRequestError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('defaults to message of erorr', () => {
          const error = wrapBadRequestError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = wrapBadRequestError(new Error('foobar'), 'biz');
          expect(error.output.payload).to.have.property('message', 'biz: foobar');
        });
        it('sets statusCode to 400', () => {
          const error = wrapBadRequestError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 400);
        });
      });
    });
  });
  describe('NotAuthorized error', () => {
    describe('wrapNotAuthorizedError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(wrapNotAuthorizedError(error)).to.be(error);
      });

      it('makes the error identifiable as a NotAuthorized error', () => {
        const error = new Error();
        expect(isNotAuthorizedError(error)).to.be(false);
        wrapNotAuthorizedError(error);
        expect(isNotAuthorizedError(error)).to.be(true);
      });

      it('adds boom properties', () => {
        const error = wrapNotAuthorizedError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(401);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        wrapNotAuthorizedError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('defaults to message of erorr', () => {
          const error = wrapNotAuthorizedError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = wrapNotAuthorizedError(new Error('foobar'), 'biz');
          expect(error.output.payload).to.have.property('message', 'biz: foobar');
        });
        it('sets statusCode to 401', () => {
          const error = wrapNotAuthorizedError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 401);
        });
      });
    });
  });
  describe('Forbidden error', () => {
    describe('wrapForbiddenError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(wrapForbiddenError(error)).to.be(error);
      });

      it('makes the error identifiable as a Forbidden error', () => {
        const error = new Error();
        expect(isForbiddenError(error)).to.be(false);
        wrapForbiddenError(error);
        expect(isForbiddenError(error)).to.be(true);
      });

      it('adds boom properties', () => {
        const error = wrapForbiddenError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(403);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        wrapForbiddenError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('defaults to message of erorr', () => {
          const error = wrapForbiddenError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = wrapForbiddenError(new Error('foobar'), 'biz');
          expect(error.output.payload).to.have.property('message', 'biz: foobar');
        });
        it('sets statusCode to 403', () => {
          const error = wrapForbiddenError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 403);
        });
      });
    });
  });
  describe('NotFound error', () => {
    describe('wrapNotFoundError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(wrapNotFoundError(error)).to.be(error);
      });

      it('makes the error identifiable as a NotFound error', () => {
        const error = new Error();
        expect(isNotFoundError(error)).to.be(false);
        wrapNotFoundError(error);
        expect(isNotFoundError(error)).to.be(true);
      });

      it('adds boom properties', () => {
        const error = wrapNotFoundError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(404);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.forbidden();
        wrapNotFoundError(error);
        expect(error.output.statusCode).to.be(403);
      });

      describe('error.output', () => {
        it('defaults to message of erorr', () => {
          const error = wrapNotFoundError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = wrapNotFoundError(new Error('foobar'), 'biz');
          expect(error.output.payload).to.have.property('message', 'biz: foobar');
        });
        it('sets statusCode to 404', () => {
          const error = wrapNotFoundError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 404);
        });
      });
    });
  });
  describe('Conflict error', () => {
    describe('wrapConflictError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(wrapConflictError(error)).to.be(error);
      });

      it('makes the error identifiable as a Conflict error', () => {
        const error = new Error();
        expect(isConflictError(error)).to.be(false);
        wrapConflictError(error);
        expect(isConflictError(error)).to.be(true);
      });

      it('adds boom properties', () => {
        const error = wrapConflictError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(409);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        wrapConflictError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('defaults to message of erorr', () => {
          const error = wrapConflictError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = wrapConflictError(new Error('foobar'), 'biz');
          expect(error.output.payload).to.have.property('message', 'biz: foobar');
        });
        it('sets statusCode to 409', () => {
          const error = wrapConflictError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 409);
        });
      });
    });
  });
  describe('EsUnavailable error', () => {
    describe('wrapEsUnavailableError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(wrapEsUnavailableError(error)).to.be(error);
      });

      it('makes the error identifiable as a EsUnavailable error', () => {
        const error = new Error();
        expect(isEsUnavailableError(error)).to.be(false);
        wrapEsUnavailableError(error);
        expect(isEsUnavailableError(error)).to.be(true);
      });

      it('adds boom properties', () => {
        const error = wrapEsUnavailableError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(503);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        wrapEsUnavailableError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('defaults to message of erorr', () => {
          const error = wrapEsUnavailableError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message', 'foobar');
        });
        it('prefixes message with passed reason', () => {
          const error = wrapEsUnavailableError(new Error('foobar'), 'biz');
          expect(error.output.payload).to.have.property('message', 'biz: foobar');
        });
        it('sets statusCode to 503', () => {
          const error = wrapEsUnavailableError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 503);
        });
      });
    });
  });
  describe('General error', () => {
    describe('wrapGeneralError', () => {
      it('returns original object', () => {
        const error = new Error();
        expect(wrapGeneralError(error)).to.be(error);
      });

      it('adds boom properties', () => {
        const error = wrapGeneralError(new Error());
        expect(error.output).to.be.an('object');
        expect(error.output.statusCode).to.be(500);
      });

      it('preserves boom properties of input', () => {
        const error = Boom.notFound();
        wrapGeneralError(error);
        expect(error.output.statusCode).to.be(404);
      });

      describe('error.output', () => {
        it('ignores error message', () => {
          const error = wrapGeneralError(new Error('foobar'));
          expect(error.output.payload).to.have.property('message').match(/internal server error/i);
        });
        it('sets statusCode to 500', () => {
          const error = wrapGeneralError(new Error('foo'));
          expect(error.output).to.have.property('statusCode', 500);
        });
      });
    });
  });
});
