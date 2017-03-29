import expect from 'expect.js';
import _ from 'lodash';
import { handleShortUrlError } from '../short_url_error';

describe('handleShortUrlError()', () => {
  const caughtErrors = [{
    status: 401
  }, {
    status: 403
  }, {
    status: 404
  }];

  const uncaughtErrors = [{
    status: null
  }, {
    status: 500
  }];

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
