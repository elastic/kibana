import expect from 'expect.js';
import KbnServer from '../../KbnServer';

describe('cookie validation', function () {
  let kbnServer;
  beforeEach(function () {
    kbnServer = new KbnServer({
      server: { autoListen: false }
    });
    return kbnServer.ready();
  });
  afterEach(function () {
    return kbnServer.close();
  });

  it('allows non-strict cookies', function (done) {
    kbnServer.server.inject({
      method: 'GET',
      url: '/',
      headers: {
        cookie: 'test:80=value;test_80=value'
      }
    }, (res) => {
      expect(res.payload).not.to.contain('Invalid cookie header');
      done();
    });
  });

  it('returns an error if the cookie can\'t be parsed', function (done) {
    kbnServer.server.inject({
      method: 'GET',
      url: '/',
      headers: {
        cookie: 'a'
      }
    }, (res) =>  {
      expect(res.payload).to.contain('Invalid cookie header');
      done();
    });
  });
});
