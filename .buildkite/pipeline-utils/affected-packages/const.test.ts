/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import * as path from 'path';
import { getKibanaDir } from '../utils.ts';
import { ALWAYS_RUN_JEST_INTEGRATION_CONFIGS } from './const.ts';

describe('ALWAYS_RUN_JEST_INTEGRATION_CONFIGS', () => {
  it('references existing jest integration config files', () => {
    const kibanaDir = getKibanaDir();
    for (const configPath of ALWAYS_RUN_JEST_INTEGRATION_CONFIGS) {
      expect(fs.existsSync(path.resolve(kibanaDir, configPath))).toBe(true);
    }
  });
});
