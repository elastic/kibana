/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { accessSync, constants } from 'fs';
import { getConfigPath, getDataPath, getLogsPath, getConfigDirectory } from '.';
import { REPO_ROOT } from '../repo_root';

expect.addSnapshotSerializer(
  ((rootPath: string = REPO_ROOT, replacement = '<absolute path>') => {
    return {
      test: (value: any) => typeof value === 'string' && value.startsWith(rootPath),
      serialize: (value: string) => value.replace(rootPath, replacement).replace(/\\/g, '/'),
    };
  })()
);

describe('Default path finder', () => {
  it('should expose a path to the config directory', () => {
    expect(getConfigDirectory()).toMatchInlineSnapshot('<absolute path>/config');
  });

  it('should expose a path to the kibana.yml', () => {
    expect(getConfigPath()).toMatchInlineSnapshot('<absolute path>/config/kibana.yml');
  });

  it('should expose a path to the data directory', () => {
    expect(getDataPath()).toMatchInlineSnapshot('<absolute path>/data');
  });

  it('should expose a path to the logs directory', () => {
    expect(getLogsPath()).toMatchInlineSnapshot('<absolute path>/logs');
  });

  it('should find a config directory', () => {
    const configDirectory = getConfigDirectory();
    expect(() => accessSync(configDirectory, constants.R_OK)).not.toThrow();
  });

  it('should find a kibana.yml', () => {
    const configPath = getConfigPath();
    expect(() => accessSync(configPath, constants.R_OK)).not.toThrow();
  });
});
