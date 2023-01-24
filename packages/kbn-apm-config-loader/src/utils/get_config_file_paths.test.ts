/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, join } from 'path';
import { getConfigPath } from '@kbn/utils';
import { getConfigurationFilePaths } from './get_config_file_paths';

describe('getConfigurationFilePaths', () => {
  const cwd = process.cwd();

  it('retrieve the config file paths from the command line arguments', () => {
    const argv = ['--config', './relative-path', '-c', '/absolute-path'];

    expect(getConfigurationFilePaths(argv)).toEqual([
      resolve(cwd, join('.', 'relative-path')),
      '/absolute-path',
    ]);
  });

  it('fallbacks to `getConfigPath` value', () => {
    const path = getConfigPath();
    expect(getConfigurationFilePaths([])).toEqual([
      path,
      path.replace('kibana.yml', 'kibana.dev.yml'),
    ]);
  });
});
