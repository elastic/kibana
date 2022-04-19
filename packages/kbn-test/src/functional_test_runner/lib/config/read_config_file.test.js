/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { readConfigFile } from './read_config_file';
import { Config } from './config';
import { EsVersion } from '../es_version';

const log = new ToolingLog();
const esVersion = new EsVersion('8.0.0');

describe('readConfigFile()', () => {
  it('reads config from a file, returns an instance of Config class', async () => {
    const config = await readConfigFile(log, esVersion, require.resolve('./__fixtures__/config.1'));
    expect(config instanceof Config).toBeTruthy();
    expect(config.get('testFiles')).toEqual(['config.1']);
  });

  it('merges setting overrides into log', async () => {
    const config = await readConfigFile(
      log,
      esVersion,
      require.resolve('./__fixtures__/config.1'),
      {
        screenshots: {
          directory: 'foo.bar',
        },
      }
    );

    expect(config.get('screenshots.directory')).toBe('foo.bar');
  });

  it('supports loading config files from within config files', async () => {
    const config = await readConfigFile(log, esVersion, require.resolve('./__fixtures__/config.2'));
    expect(config.get('testFiles')).toEqual(['config.1', 'config.2']);
  });

  it('throws if settings are invalid', async () => {
    try {
      await readConfigFile(log, esVersion, require.resolve('./__fixtures__/config.invalid'));
      throw new Error('expected readConfigFile() to fail');
    } catch (err) {
      expect(err.message).toMatch(/"foo"/);
    }
  });
});
