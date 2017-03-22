import expect from 'expect.js';
import setHeaders from '../set_headers';

describe('plugins/elasticsearch', function () {
  describe('lib/set_headers', function () {
    it('throws if not given an object as the first argument', function () {
      const fn = () => setHeaders(null, {});
      expect(fn).to.throwError();
    });

    it('throws if not given an object as the second argument', function () {
      const fn = () => setHeaders({}, null);
      expect(fn).to.throwError();
    });

    it('returns a new object', function () {
      const originalHeaders = {};
      const newHeaders = {};
      const returnedHeaders = setHeaders(originalHeaders, newHeaders);
      expect(returnedHeaders).not.to.be(originalHeaders);
      expect(returnedHeaders).not.to.be(newHeaders);
    });

    it('returns object with newHeaders merged with originalHeaders', function () {
      const originalHeaders = { foo: 'bar' };
      const newHeaders = { one: 'two' };
      const returnedHeaders = setHeaders(originalHeaders, newHeaders);
      expect(returnedHeaders).to.eql({ foo: 'bar', one: 'two' });
    });

    it('returns object where newHeaders takes precedence for any matching keys', function () {
      const originalHeaders = { foo: 'bar' };
      const newHeaders = { one: 'two', foo: 'notbar' };
      const returnedHeaders = setHeaders(originalHeaders, newHeaders);
      expect(returnedHeaders).to.eql({ foo: 'notbar', one: 'two' });
    });
  });
});
