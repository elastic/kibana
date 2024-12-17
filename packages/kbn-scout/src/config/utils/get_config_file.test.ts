/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { getConfigFilePath } from './get_config_file';

describe('getConfigFilePath', () => {
  it('should return the correct path for stateful config', () => {
    const config = 'stateful';
    const expectedPath = path.join(__dirname, 'stateful', 'stateful.config.ts');

    const result = getConfigFilePath(config);

    expect(result).toBe(expectedPath);
  });

  it('should return the correct path for serverless config with a valid type', () => {
    const config = 'serverless=oblt';
    const expectedPath = path.join(__dirname, 'serverless', 'oblt.serverless.config.ts');

    const result = getConfigFilePath(config);

    expect(result).toBe(expectedPath);
  });
});
