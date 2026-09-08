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
import { ScoutTestTarget } from '@kbn/scout-info';

// Not mocking to validate the actual path to the config file
const CONFIG_SETS_ROOT = join(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets'
);

describe('getConfigFilePath', () => {
  it('should return the correct path for stateful config', () => {
    const configRootDir = join(CONFIG_SETS_ROOT, 'default', 'stateful');
    const testTarget = new ScoutTestTarget('local', 'stateful', 'classic');
    const expectedPath = join(
      CONFIG_SETS_ROOT,
      'default',
      'stateful',
      'classic.stateful.config.ts'
    );

    const result = getConfigFilePath(configRootDir, testTarget);

    expect(result).toBe(expectedPath);
  });

  it('should return the correct path for serverless config with a valid type', () => {
    const configRootDir = join(CONFIG_SETS_ROOT, 'default', 'serverless');
    const testTarget = new ScoutTestTarget('local', 'serverless', 'observability_complete');
    const expectedPath = join(
      CONFIG_SETS_ROOT,
      'default',
      'serverless',
      'observability_complete.serverless.config.ts'
    );

    const result = getConfigFilePath(configRootDir, testTarget);

    expect(result).toBe(expectedPath);
  });

  it('should return the correct path for custom config', () => {
    const configRootDir = join(CONFIG_SETS_ROOT, 'uiam_local', 'serverless');
    const testTarget = new ScoutTestTarget('local', 'serverless', 'search');
    const expectedPath = join(
      CONFIG_SETS_ROOT,
      'uiam_local',
      'serverless',
      'search.serverless.config.ts'
    );

    const result = getConfigFilePath(configRootDir, testTarget);

    expect(result).toBe(expectedPath);
  });
});
