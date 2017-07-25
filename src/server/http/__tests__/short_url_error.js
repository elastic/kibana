import expect from 'expect.js';
import _ from 'lodash';
import { handleShortUrlError } from '../short_url_error';

function createErrorWithStatus(status) {
  const error = new Error();
  error.status = status;
}

function createErrorWithStatusCode(statusCode) {
  const error = new Error();
  error.statusCode = statusCode;
}

describe('handleShortUrlError()', () => {
  const caughtErrors = [
    createErrorWithStatus(401),
    createErrorWithStatus(403),
    createErrorWithStatus(404),
    createErrorWithStatusCode(401),
    createErrorWithStatusCode(403),
    createErrorWithStatusCode(404),
  ];

  const uncaughtErrors = [
    new Error(),
    createErrorWithStatus(500),
    createErrorWithStatusCode(500)
  ];

  caughtErrors.forEach((err) => {
    it(`should handle ${err.status} errors`, function () {
      expect(_.get(handleShortUrlError(err), 'output.statusCode')).to.be(err.status);
    });
  });

  uncaughtErrors.forEach((err) => {
    it(`should not handle unknown errors`, function () {
      expect(_.get(handleShortUrlError(err), 'output.statusCode')).to.be(500);
    });
  });
});
