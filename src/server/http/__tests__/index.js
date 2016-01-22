import expect from 'expect.js';
import requirefrom from 'requirefrom';

const requireFromTest = requirefrom('test');
const kbnTestServer = requireFromTest('utils/kbn_server');

describe('cookie validation', function () {
  let kbnServer;
  beforeEach(function () {
    kbnServer = kbnTestServer.createServer();
    return kbnServer.ready();
  });
  afterEach(function () {
    return kbnServer.close();
  });

  it('allows non-strict cookies', function (done) {
    const options = {
      method: 'GET',
      url: '/',
      headers: {
        cookie: 'test:80=value;test_80=value'
      }
    };
    kbnTestServer.makeRequest(kbnServer, options, (res) => {
      expect(res.payload).not.to.contain('Invalid cookie header');
      done();
    });
  });

  it('returns an error if the cookie can\'t be parsed', function (done) {
    const options = {
      method: 'GET',
      url: '/',
      headers: {
        cookie: 'a'
      }
    };
    kbnTestServer.makeRequest(kbnServer, options, (res) =>  {
      expect(res.payload).to.contain('Invalid cookie header');
      done();
    });
  });
});
