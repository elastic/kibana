import expect from 'expect.js';
import { rewriteDeprecatedConfig } from '../deprecated_config';
import sinon from 'auto-release-sinon';

describe('cli/serve/deprecated_config', function () {
  it('returns a clone of the input', function () {
    const file = {};
    const output = rewriteDeprecatedConfig(file);
    expect(output).to.not.be(file);
  });

  describe('legacy config values', function () {
    it('rewrites legacy config values with literal path replacement', function () {
      const file = { port: 4000, host: 'kibana.com' };
      const output = rewriteDeprecatedConfig(file);
      expect(output).to.not.be(file);
      expect(output).to.eql({
        'server.port': 4000,
        'server.host': 'kibana.com',
      });
    });

    it('logs warnings when legacy config properties are encountered', function () {
      const log = sinon.stub();
      rewriteDeprecatedConfig({ port: 5555 }, log);
      sinon.assert.calledOnce(log);
      expect(log.firstCall.args[0]).to.match(/port.+deprecated.+server\.port/);
    });
  });

  describe('deprecated config values', function () {
    it('logs warnings about deprecated config values', function () {
      const log = sinon.stub();
      rewriteDeprecatedConfig({ 'server.xsrf.token': 'xxtokenxx' }, log);
      sinon.assert.calledOnce(log);
      expect(log.firstCall.args[0]).to.match(/server\.xsrf\.token.+deprecated/);
    });

    it('passes deprecated values through', function () {
      const prop = 'server.xsrf.token';
      const file = { [prop]: 'xxtokenxx' };
      const output = rewriteDeprecatedConfig(file);
      expect(output).to.not.be(file);
      expect(output).to.have.property(prop, file[prop]);
    });

    context('defined in a mixture of path keys and objects', function () {
      it('detects nested propertie', function () {
        const log = sinon.stub();
        rewriteDeprecatedConfig({
          server: {
            xsrf: {
              token: 'x'
            }
          }
        }, log);
        sinon.assert.calledOnce(log);
      });

      it('detects compound properties inside an object', function () {
        const log = sinon.stub();
        rewriteDeprecatedConfig({
          server: {
            'xsrf.token': 'x'
          }
        }, log);
        sinon.assert.calledOnce(log);
      });

      it('detects a property under a compound property', function () {
        const log = sinon.stub();
        rewriteDeprecatedConfig({
          'server.xsrf': {
            token: 'x'
          }
        }, log);
        sinon.assert.calledOnce(log);
      });
    });
  });
});
