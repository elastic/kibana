import { spawnSync } from 'child_process';
import { resolve } from 'path';

import expect from 'expect.js';

const ROOT_DIR = resolve(__dirname, '../../../../');
const INVALID_CONFIG_PATH = resolve(__dirname, 'fixtures/invalid_config.yml');

describe('cli invalid config support', function () {
  this.timeout(20 * 1000);
  this.slow(10 * 1000);

  it('exits with statusCode 64 and logs a single line when config is invalid', function () {
    const { error, status, stdout } = spawnSync(process.execPath, [
      'src/cli',
      '--config', INVALID_CONFIG_PATH
    ], {
      cwd: ROOT_DIR
    });

    const logLines = stdout.toString('utf8')
      .split('\n')
      .filter(Boolean)
      .map(JSON.parse);

    expect(error).to.be(undefined);
    expect(status).to.be(64);

    expect(logLines).to.have.length(1);
    expect(logLines[0]).to.have.property('tags')
      .eql(['fatal']);
    expect(logLines[0]).to.have.property('message')
      .contain('"unknown.key"')
      .contain('"other.unknown.key"')
      .contain('"other.third"')
      .contain('"some.flat.key"')
      .contain('"some.array"');
  });
});
