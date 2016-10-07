import complete from '../complete';
import expect from 'expect.js';
import { noop } from 'lodash';
import sinon from 'sinon';

describe('server config complete', function () {
  it(`should call server.log when there's an unused setting`, function () {
    const kbnServer = {
      settings: {
        unused: true
      }
    };

    const server = {
      decorate: noop,
      log: sinon.spy()
    };

    const config = {
      get: sinon.stub().returns({
        used: true
      })
    };

    complete(kbnServer, server, config);

    expect(server.log.calledOnce).to.be(true);
  });

  it(`shouldn't call server.log when there isn't an unused setting`, function () {
    const kbnServer = {
      settings: {
        used: true
      }
    };

    const server = {
      decorate: noop,
      log: sinon.spy()
    };

    const config = {
      get: sinon.stub().returns({
        used: true
      })
    };

    complete(kbnServer, server, config);

    expect(server.log.called).to.be(false);
  });

  it(`shouldn't call server.log when there are more config values than settings`, function () {
    const kbnServer = {
      settings: {
        used: true
      }
    };

    const server = {
      decorate: noop,
      log: sinon.spy()
    };

    const config = {
      get: sinon.stub().returns({
        used: true,
        foo: 'bar'
      })
    };

    complete(kbnServer, server, config);
    expect(server.log.called).to.be(false);
  });

  it('should transform deprecated settings ', function () {
    const kbnServer = {
      settings: {
        port: 8080
      }
    };

    const server = {
      decorate: noop,
      log: sinon.spy()
    };

    const config = {
      get: sinon.stub().returns({
        server: {
          port: 8080
        }
      })
    };

    complete(kbnServer, server, config);
    expect(server.log.called).to.be(false);
  });
});
