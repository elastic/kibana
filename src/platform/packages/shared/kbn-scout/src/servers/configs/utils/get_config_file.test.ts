/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getConfigFilePath } from './get_config_file';

// Not mocking to validate the actual path to the config file
const CONFIG_ROOT = join(REPO_ROOT, 'src/platform/packages/shared/kbn-scout/src/servers/configs');

describe('getConfigFilePath', () => {
  it('should return the correct path for stateful config', () => {
    const configRootDir = join(CONFIG_ROOT, 'default', 'stateful');
    const mode = 'stateful';
    const expectedPath = join(CONFIG_ROOT, 'default', 'stateful', 'stateful.config.ts');

    const result = getConfigFilePath(configRootDir, mode);

    expect(result).toBe(expectedPath);
  });

  it('should return the correct path for serverless config with a valid type', () => {
    const configRootDir = join(CONFIG_ROOT, 'default', 'serverless');
    const mode = 'serverless=oblt';
    const expectedPath = join(CONFIG_ROOT, 'default', 'serverless', 'oblt.serverless.config.ts');

    const result = getConfigFilePath(configRootDir, mode);

    expect(result).toBe(expectedPath);
  });

  it('should convert hyphens to underscores in serverless type', () => {
    const configRootDir = join(CONFIG_ROOT, 'default', 'serverless');
    const mode = 'serverless=oblt-logs-essentials';
    const expectedPath = join(
      CONFIG_ROOT,
      'default',
      'serverless',
      'oblt_logs_essentials.serverless.config.ts'
    );

    const result = getConfigFilePath(configRootDir, mode);

    expect(result).toBe(expectedPath);
  });

  it('should return the correct path for custom config', () => {
    const configRootDir = join(CONFIG_ROOT, 'custom', 'uiam_local', 'serverless');
    const mode = 'serverless=es';
    const expectedPath = join(
      CONFIG_ROOT,
      'custom',
      'uiam_local',
      'serverless',
      'es.serverless.config.ts'
    );

    const result = getConfigFilePath(configRootDir, mode);

    expect(result).toBe(expectedPath);
  });
});
