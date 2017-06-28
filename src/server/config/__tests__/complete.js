import completeMixin from '../complete';
import expect from 'expect.js';
import { noop } from 'lodash';
import sinon from 'sinon';

describe('server/config completeMixin()', function () {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.restore());

  const setup = ({ settings, configValues }) => {
    const kbnServer = {
      settings,
    };

    const server = {
      decorate: noop,
      log: sinon.spy()
    };

    const config = {
      get: sinon.stub().returns(configValues)
    };

    const callCompleteMixin = () => {
      completeMixin(kbnServer, server, config);
    };

    return { server, callCompleteMixin };
  };

  describe('all settings used', () => {
    it(`shouldn't call server.log`, function () {
      const { server, callCompleteMixin } = setup({
        settings: {
          used: true
        },
        configValues: {
          used: true
        },
      });

      callCompleteMixin();
      expect(server.log.called).to.be(false);
    });

    describe('more config values than settings', () => {
      it(`shouldn't call server.log`, function () {
        const { server, callCompleteMixin } = setup({
          settings: {
            used: true
          },
          configValues: {
            used: true,
            foo: 'bar'
          }
        });

        callCompleteMixin();
        expect(server.log.called).to.be(false);
      });
    });
  });


  describe('some settings unused', () => {
    it(`should call server.log`, function () {
      const { server, callCompleteMixin } = setup({
        settings: {
          unused: true
        },
        configValues: {
          used: true
        }
      });

      callCompleteMixin();
      expect(server.log.calledOnce).to.be(true);
    });
  });


  describe('deprecation support', () => {
    it('should transform server.ssl.cert to server.ssl.certificate', function () {
      const { server, callCompleteMixin } = setup({
        settings: {
          server: {
            ssl: {
              cert: 'path/to/cert'
            }
          }
        },
        configValues: {
          server: {
            ssl: {
              certificate: 'path/to/cert'
            }
          }
        }
      });

      callCompleteMixin();
      expect(server.log.called).to.be(false);
    });
  });
});
