import expect from 'expect.js';
import getUrl from '../get_url';

describe('getUrl', function () {
  it('should convert to a url', function () {
    const url = getUrl({
      protocol: 'http',
      hostname: 'localhost',
    }, {
      pathname: 'foo'
    });

    expect(url).to.be('http://localhost/foo');
  });

  it('should convert to a url with port', function () {
    const url = getUrl({
      protocol: 'http',
      hostname: 'localhost',
      port: 9220
    }, {
      pathname: 'foo'
    });

    expect(url).to.be('http://localhost:9220/foo');
  });

  it('should convert to a secure hashed url', function () {
    expect(getUrl({
      protocol: 'https',
      hostname: 'localhost',
    }, {
      pathname: 'foo',
      hash: 'bar'
    })).to.be('https://localhost/foo#bar');
  });
});
