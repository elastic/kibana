import expect from 'expect.js';

import { createToolingLog } from '../../../../utils';
import { readConfigFile } from '../read_config_file';
import { Config } from '../config';

const log = createToolingLog().resume();

describe('readConfigFile()', () => {
  it('reads config from a file, returns an instance of Config class', async () => {
    const config = await readConfigFile(log, require.resolve('./fixtures/config.1'));
    expect(config).to.be.a(Config);
    expect(config.get('testFiles')).to.eql([
      'config.1'
    ]);
  });

  it('merges setting overrides into log', async () => {
    const config = await readConfigFile(log, require.resolve('./fixtures/config.1'), {
      screenshots: {
        directory: 'foo.bar'
      }
    });

    expect(config.get('screenshots.directory')).to.be('foo.bar');
  });

  it('supports loading config files from within config files', async () => {
    const config = await readConfigFile(log, require.resolve('./fixtures/config.2'));
    expect(config.get('testFiles')).to.eql([
      'config.1',
      'config.2',
    ]);
  });

  it('throws if settings are invalid', async () => {
    try {
      await readConfigFile(log, require.resolve('./fixtures/config.invalid'));
      throw new Error('expected readConfigFile() to fail');
    } catch (err) {
      expect(err.message).to.match(/"foo"/);
    }
  });

  it('throws if config does not define testFiles', async () => {
    try {
      await readConfigFile(log, require.resolve('./fixtures/config.4'));
      throw new Error('expected readConfigFile() to fail');
    } catch (err) {
      expect(err.message).to.match(/"testFiles"/);
    }
  });

  it('does not throw if child config file does not have any testFiles', async () => {
    const config = await readConfigFile(log, require.resolve('./fixtures/config.3'));
    expect(config.get('screenshots.directory')).to.be('bar');
  });
});
