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
    };

    const config = {
      get: sinon.stub().returns(configValues)
    };

    const callCompleteMixin = () => {
      completeMixin(kbnServer, server, config);
    };

    return { callCompleteMixin };
  };

  describe('all settings used', () => {
    it('should not throw', function () {
      const { callCompleteMixin } = setup({
        settings: {
          used: true
        },
        configValues: {
          used: true
        },
      });

      callCompleteMixin();
    });

    describe('more config values than settings', () => {
      it('should not throw', function () {
        const { callCompleteMixin } = setup({
          settings: {
            used: true
          },
          configValues: {
            used: true,
            foo: 'bar'
          }
        });

        callCompleteMixin();
      });
    });
  });

  describe('some settings unused', () => {
    it('should throw an error', function () {
      const { callCompleteMixin } = setup({
        settings: {
          unused: true
        },
        configValues: {
          used: true
        }
      });

      expect(callCompleteMixin).to.throwError('"unused" not applied');
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
    });
  });
});
