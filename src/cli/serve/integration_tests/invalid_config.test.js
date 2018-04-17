import { spawnSync } from 'child_process';
import { resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '../../../../');
const INVALID_CONFIG_PATH = resolve(__dirname, '__fixtures__/invalid_config.yml');

describe('cli invalid config support', function () {
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
      .map(JSON.parse)
      .map(obj => ({
        ...obj,
        pid: '## PID ##',
        '@timestamp': '## @timestamp ##'
      }));

    expect(error).toBe(undefined);
    expect(status).toBe(64);
    expect(logLines).toMatchSnapshot();
  }, 20 * 1000);
});
