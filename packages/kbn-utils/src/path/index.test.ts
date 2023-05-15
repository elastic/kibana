/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import { accessSync, constants } from 'fs';
import { getConfigPath, getDataPath, getConfigDirectory, buildDataPaths } from '.';
import { REPO_ROOT } from '@kbn/repo-info';

expect.addSnapshotSerializer(
  ((rootPath: string = REPO_ROOT, replacement = '<absolute path>') => {
    return {
      test: (value: any) => typeof value === 'string' && value.startsWith(rootPath),
      serialize: (value: string) => value.replace(rootPath, replacement).replace(/\\/g, '/'),
    };
  })()
);

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

describe('Custom data path finder', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    process.argv = originalArgv;
  });

  it('overrides path.data when provided as command line argument', () => {
    process.argv = ['--foo', 'bar', '--path.data', '/some/data/path', '--baz', 'xyz'];

    /*
     * Test buildDataPaths since getDataPath returns the first valid directory and
     * custom paths do not exist in environment. Custom directories are built during env init.
     */
    expect(buildDataPaths()).toMatchInlineSnapshot(`
      Array [
        <absolute path>/some/data/path,
        <absolute path>/data,
        "/var/lib/kibana",
      ]
    `);
  });

  it('ignores the path.data flag when no value is provided', () => {
    process.argv = ['--foo', 'bar', '--path.data', '--baz', 'xyz'];

    expect(buildDataPaths()).toMatchInlineSnapshot(`
      Array [
        <absolute path>/data,
        "/var/lib/kibana",
      ]
    `);
  });

  it('overrides path.when when provided by kibana.yml', () => {
    process.env.KBN_PATH_CONF = join(__dirname, '__fixtures__');

    expect(buildDataPaths()).toMatchInlineSnapshot(`
      Array [
        <absolute path>/path/from/yml,
        <absolute path>/data,
        "/var/lib/kibana",
      ]
    `);

    delete process.env.KBN_PATH_CONF;
  });
});
