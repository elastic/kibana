import expect from 'expect.js';
import { set } from 'lodash';
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
});
