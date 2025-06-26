/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { getConfigFilePath } from './get_config_file';
import { REPO_ROOT } from '@kbn/repo-info';

// Not mocking to validate the actual path to the config file
const CONFIG_ROOT = join(REPO_ROOT, 'src/platform/packages/shared/kbn-scout/src/config');

describe('getConfigFilePath', () => {
  it('should return the correct path for stateful config', () => {
    const config = 'stateful';
    const expectedPath = join(CONFIG_ROOT, 'stateful', 'stateful.config.ts');

    const result = getConfigFilePath(config);

    expect(result).toBe(expectedPath);
  });

  it('should return the correct path for serverless config with a valid type', () => {
    const config = 'serverless=oblt';
    const expectedPath = join(CONFIG_ROOT, 'serverless', 'oblt.serverless.config.ts');

    const result = getConfigFilePath(config);

    expect(result).toBe(expectedPath);
  });
});
