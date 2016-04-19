import expect from 'expect.js';
import { rewriteLegacyConfig } from '../legacy_config';
import sinon from 'auto-release-sinon';

describe('cli/serve/legacy_config', function () {
  it('returns a clone of the input', function () {
    const file = {};
    const output = rewriteLegacyConfig(file);
    expect(output).to.not.be(file);
  });

  it('rewrites legacy config values with literal path replacement', function () {
    const file = { port: 4000, host: 'kibana.com' };
    const output = rewriteLegacyConfig(file);
    expect(output).to.not.be(file);
    expect(output).to.eql({
      'server.port': 4000,
      'server.host': 'kibana.com',
    });
  });

  it('logs warnings when legacy config properties are encountered', function () {
    const log = sinon.stub();
    rewriteLegacyConfig({ port: 5555 }, log);
    sinon.assert.calledOnce(log);
    expect(log.firstCall.args[0]).to.match(/port.+deprecated.+server\.port/);
  });
});
