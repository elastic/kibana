/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const mockReaddir = jest.fn();
const mockReadFile = jest.fn();
const mockStat = jest.fn();
jest.mock('fs', () => ({
  readdir: mockReaddir,
  readFile: mockReadFile,
  stat: mockStat,
}));

import { resolve } from 'path';
import { map, toArray } from 'rxjs/operators';
import { logger } from '../../logging/__mocks__';
import { discover } from './plugins_discovery';

const TEST_PATHS = {
  scanDirs: {
    nonEmpty: resolve('scan', 'non-empty'),
    nonEmpty2: resolve('scan', 'non-empty-2'),
    nonExistent: resolve('scan', 'non-existent'),
    empty: resolve('scan', 'empty'),
  },
  paths: {
    existentDir: resolve('path', 'existent-dir'),
    existentDir2: resolve('path', 'existent-dir-2'),
    nonDir: resolve('path', 'non-dir'),
    nonExistent: resolve('path', 'non-existent'),
  },
};

beforeEach(() => {
  mockReaddir.mockImplementation((path, cb) => {
    if (path === TEST_PATHS.scanDirs.nonEmpty) {
      cb(null, ['1', '2-no-manifest', '3', '4-incomplete-manifest']);
    } else if (path === TEST_PATHS.scanDirs.nonEmpty2) {
      cb(null, ['5-invalid-manifest', '6', '7-non-dir', '8-incompatible-manifest']);
    } else if (path === TEST_PATHS.scanDirs.nonExistent) {
      cb(new Error('ENOENT'));
    } else {
      cb(null, []);
    }
  });

  mockStat.mockImplementation((path, cb) => {
    if (path.includes('non-existent')) {
      cb(new Error('ENOENT'));
    } else {
      cb(null, { isDirectory: () => !path.includes('non-dir') });
    }
  });

  mockReadFile.mockImplementation((path, cb) => {
    if (path.includes('no-manifest')) {
      cb(new Error('ENOENT'));
    } else if (path.includes('invalid-manifest')) {
      cb(null, Buffer.from('not-json'));
    } else if (path.includes('incomplete-manifest')) {
      cb(null, Buffer.from(JSON.stringify({ version: '1' })));
    } else if (path.includes('incompatible-manifest')) {
      cb(null, Buffer.from(JSON.stringify({ id: 'plugin', version: '1' })));
    } else {
      cb(null, Buffer.from(JSON.stringify({ id: 'plugin', version: '1', kibanaVersion: '1.2.3' })));
    }
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('properly scans folders and paths', async () => {
  const { plugin$, error$ } = discover(
    {
      initialize: true,
      scanDirs: Object.values(TEST_PATHS.scanDirs),
      paths: Object.values(TEST_PATHS.paths),
    },
    {
      branch: 'master',
      buildNum: 1,
      buildSha: '',
      version: '1.2.3',
    },
    logger.get()
  );

  await expect(plugin$.pipe(toArray()).toPromise()).resolves.toEqual(
    [
      resolve(TEST_PATHS.scanDirs.nonEmpty, '1'),
      resolve(TEST_PATHS.scanDirs.nonEmpty, '3'),
      resolve(TEST_PATHS.scanDirs.nonEmpty2, '6'),
      resolve(TEST_PATHS.paths.existentDir),
      resolve(TEST_PATHS.paths.existentDir2),
    ].map(path => ({
      manifest: {
        id: 'plugin',
        version: '1',
        kibanaVersion: '1.2.3',
        optionalPlugins: [],
        requiredPlugins: [],
        ui: false,
      },
      path,
    }))
  );

  await expect(
    error$
      .pipe(
        map(error => error.toString()),
        toArray()
      )
      .toPromise()
  ).resolves.toEqual([
    `Error: ENOENT (invalid-scan-dir, ${resolve(TEST_PATHS.scanDirs.nonExistent)})`,
    `Error: ${resolve(TEST_PATHS.paths.nonDir)} is not a directory. (invalid-plugin-dir, ${resolve(
      TEST_PATHS.paths.nonDir
    )})`,
    `Error: ENOENT (invalid-plugin-dir, ${resolve(TEST_PATHS.paths.nonExistent)})`,
    `Error: ENOENT (missing-manifest, ${resolve(
      TEST_PATHS.scanDirs.nonEmpty,
      '2-no-manifest',
      'kibana.json'
    )})`,
    `Error: Plugin manifest must contain an "id" property. (invalid-manifest, ${resolve(
      TEST_PATHS.scanDirs.nonEmpty,
      '4-incomplete-manifest',
      'kibana.json'
    )})`,
    `Error: Unexpected token o in JSON at position 1 (invalid-manifest, ${resolve(
      TEST_PATHS.scanDirs.nonEmpty2,
      '5-invalid-manifest',
      'kibana.json'
    )})`,
    `Error: Plugin "plugin" is only compatible with Kibana version "1", but used Kibana version is "1.2.3". (incompatible-version, ${resolve(
      TEST_PATHS.scanDirs.nonEmpty2,
      '8-incompatible-manifest',
      'kibana.json'
    )})`,
  ]);
});
