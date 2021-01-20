/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { accessSync, constants } from 'fs';
import { getConfigPath, getDataPath, getConfigDirectory } from './';

describe('Default path finder', () => {
  it('should find a kibana.yml', () => {
    const configPath = getConfigPath();
    expect(() => accessSync(configPath, constants.R_OK)).not.toThrow();
  });

  it('should find a data directory', () => {
    const dataPath = getDataPath();
    expect(() => accessSync(dataPath, constants.R_OK)).not.toThrow();
  });

  it('should find a config directory', () => {
    const configDirectory = getConfigDirectory();
    expect(() => accessSync(configDirectory, constants.R_OK)).not.toThrow();
  });
});
