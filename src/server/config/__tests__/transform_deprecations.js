import expect from 'expect.js';
import sinon from 'sinon';
import { transformDeprecations } from '../transform_deprecations';

describe('server/config', function () {
  describe('transformDeprecations', function () {
    describe('server.ssl.enabled', function () {
      it('sets enabled to true when certificate and key are set', function () {
        const settings = {
          server: {
            ssl: {
              certificate: '/cert.crt',
              key: '/key.key'
            }
          }
        };

        const result = transformDeprecations(settings);
        expect(result.server.ssl.enabled).to.be(true);
      });

      it('logs a message when automatically setting enabled to true', function () {
        const settings = {
          server: {
            ssl: {
              certificate: '/cert.crt',
              key: '/key.key'
            }
          }
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.calledOnce).to.be(true);
      });

      it(`doesn't set enabled when key and cert aren't set`, function () {
        const settings = {
          server: {
            ssl: {}
          }
        };

        const result = transformDeprecations(settings);
        expect(result.server.ssl.enabled).to.be(undefined);
      });

      it(`doesn't log a message when not automatically setting enabled`, function () {
        const settings = {
          server: {
            ssl: {}
          }
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.called).to.be(false);
      });
    });
  });
});
