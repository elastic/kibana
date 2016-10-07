import expect from 'expect.js';
import { noop, set } from 'lodash';
import { checkForDeprecatedConfig } from '../deprecated_config';
import sinon from 'auto-release-sinon';

describe('cli/serve/deprecated_config', function () {
  it('passes original config through', function () {
    const config = {};
    set(config, 'server.xsrf.token', 'xxtokenxx');
    const output = checkForDeprecatedConfig(config);
    expect(output).to.be(config);
    expect(output.server).to.be(config.server);
    expect(output.server.xsrf).to.be(config.server.xsrf);
    expect(output.server.xsrf.token).to.be(config.server.xsrf.token);
  });

  it('logs warnings about deprecated config values', function () {
    const log = sinon.stub();
    const config = {};
    set(config, 'server.xsrf.token', 'xxtokenxx');
    checkForDeprecatedConfig(config, log);
    sinon.assert.calledOnce(log);
    expect(log.firstCall.args[0]).to.match(/server\.xsrf\.token.+deprecated/);
  });

  describe('does not support compound.keys', function () {
    it('ignores fully compound keys', function () {
      const log = sinon.stub();
      const config = { 'server.xsrf.token': 'xxtokenxx' };
      checkForDeprecatedConfig(config, log);
      sinon.assert.notCalled(log);
    });

    it('ignores partially compound keys', function () {
      const log = sinon.stub();
      const config = { server: { 'xsrf.token': 'xxtokenxx' } };
      checkForDeprecatedConfig(config, log);
      sinon.assert.notCalled(log);
    });

    it('ignores partially compound keys', function () {
      const log = sinon.stub();
      const config = { 'server.xsrf': { token: 'xxtokenxx' } };
      checkForDeprecatedConfig(config, log);
      sinon.assert.notCalled(log);
    });
  });

  describe('server.ssl.enabled', function () {
    it('set to true when enabled is null and the cert/key are specified', function () {
      const log = noop;
      const config = {};
      set(config, 'server.ssl', { certificate: 'somePath.cert', key: 'somePath.key' });
      const output = checkForDeprecatedConfig(config, log);
      expect(output).to.be(config);
      expect(output.server).to.be(config.server);
      expect(output.server.ssl).to.be(config.server.ssl);
      expect(output.server.ssl.enabled).to.be(true);
    });

    it('to be undefined when cert/key aren\'t specified', function () {
      const log = noop;
      const config = {};
      checkForDeprecatedConfig(config, log);
      expect(config.server).to.be(undefined);
    });

    it('doesn\'t log deprecation warning when enabled is set', function () {
      const log = sinon.stub();
      const config = {};
      set(config, 'server.ssl.enabled', true);
      checkForDeprecatedConfig(config, log);
      sinon.assert.notCalled(log);
    });

    it('logs deprecation warning when determining to use ssl based on the cert/key', function () {
      const log = sinon.stub();
      const config = {};
      set(config, 'server.ssl', { certificate: 'somePath.cert', key: 'somePath.key' });
      checkForDeprecatedConfig(config, log);
      sinon.assert.calledOnce(log);
      expect(log.firstCall.args[0]).to.match(/deprecated.+server\.ssl\.enabled/);
    });
  });
});
