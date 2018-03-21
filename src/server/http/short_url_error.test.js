import _ from 'lodash';
import { handleShortUrlError } from './short_url_error';

function createErrorWithStatus(status) {
  const error = new Error();
  error.status = status;
  return error;
}

function createErrorWithStatusCode(statusCode) {
  const error = new Error();
  error.statusCode = statusCode;
  return error;
}

describe('handleShortUrlError()', () => {
  const caughtErrorsWithStatus = [
    createErrorWithStatus(401),
    createErrorWithStatus(403),
    createErrorWithStatus(404),
  ];

  const caughtErrorsWithStatusCode = [
    createErrorWithStatusCode(401),
    createErrorWithStatusCode(403),
    createErrorWithStatusCode(404),
  ];

  const uncaughtErrors = [
    new Error(),
    createErrorWithStatus(500),
    createErrorWithStatusCode(500)
  ];

  caughtErrorsWithStatus.forEach((err) => {
    it(`should handle errors with status of ${err.status}`, function () {
      expect(_.get(handleShortUrlError(err), 'output.statusCode')).toBe(err.status);
    });
  });

  caughtErrorsWithStatusCode.forEach((err) => {
    it(`should handle errors with statusCode of ${err.statusCode}`, function () {
      expect(_.get(handleShortUrlError(err), 'output.statusCode')).toBe(err.statusCode);
    });
  });

  uncaughtErrors.forEach((err) => {
    it(`should not handle unknown errors`, function () {
      expect(_.get(handleShortUrlError(err), 'output.statusCode')).toBe(500);
    });
  });
});
