import sinon from 'sinon';
import { transformDeprecations } from './transform_deprecations';

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
        expect(result.server.ssl.enabled).toBe(true);
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
        expect(log.calledOnce).toBe(true);
      });

      it(`doesn't set enabled when key and cert aren't set`, function () {
        const settings = {
          server: {
            ssl: {}
          }
        };

        const result = transformDeprecations(settings);
        expect(result.server.ssl.enabled).toBe(undefined);
      });

      it(`doesn't log a message when not automatically setting enabled`, function () {
        const settings = {
          server: {
            ssl: {}
          }
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.called).toBe(false);
      });
    });

    describe('savedObjects.indexCheckTimeout', () => {
      it('removes the indexCheckTimeout and savedObjects properties', () => {
        const settings = {
          savedObjects: {
            indexCheckTimeout: 123
          }
        };

        expect(transformDeprecations(settings)).toEqual({});
      });

      it('keeps the savedObjects property if it has other keys', () => {
        const settings = {
          savedObjects: {
            indexCheckTimeout: 123,
            foo: 'bar'
          }
        };

        expect(transformDeprecations(settings)).toEqual({
          savedObjects: {
            foo: 'bar'
          }
        });
      });

      it('logs that the setting is no longer necessary', () => {
        const settings = {
          savedObjects: {
            indexCheckTimeout: 123
          }
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        sinon.assert.calledOnce(log);
        sinon.assert.calledWithExactly(log, sinon.match('savedObjects.indexCheckTimeout'));
      });
    });
  });
});
