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
import { Observable } from 'rxjs';
import { map, toArray } from 'rxjs/operators';
import { logger } from '../../logging/__mocks__';
import { PluginManifest } from './plugin_manifest_parser';
import { discover } from './plugins_discovery';

/**
 * Resolves absolute path and escapes backslashes (used on windows systems).
 * @param pathSegments Test path segments.
 */
function resolveForSnapshot(...pathSegments: string[]) {
  return resolve(...pathSegments).replace(/\\/g, '\\\\');
}

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

  await expect(plugin$.pipe(toArray()).toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  Object {
    "manifest": Object {
      "id": "plugin",
      "kibanaVersion": "1.2.3",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "1",
    },
    "path": "${resolveForSnapshot(TEST_PATHS.scanDirs.nonEmpty, '1')}",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
      "kibanaVersion": "1.2.3",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "1",
    },
    "path": "${resolveForSnapshot(TEST_PATHS.scanDirs.nonEmpty, '3')}",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
      "kibanaVersion": "1.2.3",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "1",
    },
    "path": "${resolveForSnapshot(TEST_PATHS.scanDirs.nonEmpty2, '6')}",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
      "kibanaVersion": "1.2.3",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "1",
    },
    "path": "${resolveForSnapshot(TEST_PATHS.paths.existentDir)}",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
      "kibanaVersion": "1.2.3",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "1",
    },
    "path": "${resolveForSnapshot(TEST_PATHS.paths.existentDir2)}",
  },
]
`);

  await expect(
    error$
      .pipe(
        map(error => error.toString()),
        toArray()
      )
      .toPromise()
  ).resolves.toMatchInlineSnapshot(`
Array [
  "Error: ENOENT (missing-manifest, ${resolveForSnapshot(
    TEST_PATHS.scanDirs.nonEmpty,
    '2-no-manifest',
    'kibana.json'
  )})",
  "Error: Plugin manifest must contain an \\"id\\" property. (invalid-manifest, ${resolveForSnapshot(
    TEST_PATHS.scanDirs.nonEmpty,
    '4-incomplete-manifest',
    'kibana.json'
  )})",
  "Error: Unexpected token o in JSON at position 1 (invalid-manifest, ${resolveForSnapshot(
    TEST_PATHS.scanDirs.nonEmpty2,
    '5-invalid-manifest',
    'kibana.json'
  )})",
  "Error: Plugin \\"plugin\\" is only compatible with Kibana version \\"1\\", but used Kibana version is \\"1.2.3\\". (incompatible-version, ${resolveForSnapshot(
    TEST_PATHS.scanDirs.nonEmpty2,
    '8-incompatible-manifest',
    'kibana.json'
  )})",
  "Error: ENOENT (invalid-scan-dir, ${resolveForSnapshot(TEST_PATHS.scanDirs.nonExistent)})",
  "Error: ${resolveForSnapshot(
    TEST_PATHS.paths.nonDir
  )} is not a directory. (invalid-plugin-dir, ${resolveForSnapshot(TEST_PATHS.paths.nonDir)})",
  "Error: ENOENT (invalid-plugin-dir, ${resolveForSnapshot(TEST_PATHS.paths.nonExistent)})",
]
`);
});

describe('parsing plugin manifest', () => {
  let plugins$: Observable<Array<{ path: string; manifest: PluginManifest }>>;
  let errors$: Observable<string[]>;
  beforeEach(async () => {
    const discoveryResult = discover(
      {
        initialize: true,
        scanDirs: [],
        paths: [TEST_PATHS.paths.existentDir],
      },
      {
        branch: 'master',
        buildNum: 1,
        buildSha: '',
        version: '7.0.0-alpha1',
      },
      logger.get()
    );

    plugins$ = discoveryResult.plugin$.pipe(toArray());
    errors$ = discoveryResult.error$.pipe(
      map(error => error.toString()),
      toArray()
    );
  });

  test('return error when manifest is empty', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(null, Buffer.from(''));
    });

    await expect(plugins$.toPromise()).resolves.toEqual([]);
    await expect(errors$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  "Error: Unexpected end of JSON input (invalid-manifest, ${resolveForSnapshot(
    TEST_PATHS.paths.existentDir,
    'kibana.json'
  )})",
]
`);
  });

  test('return error when manifest content is null', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(null, Buffer.from('null'));
    });

    await expect(plugins$.toPromise()).resolves.toEqual([]);
    await expect(errors$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  "Error: Plugin manifest must contain a JSON encoded object. (invalid-manifest, ${resolveForSnapshot(
    TEST_PATHS.paths.existentDir,
    'kibana.json'
  )})",
]
`);
  });

  test('return error when manifest content is not a valid JSON', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(null, Buffer.from('not-json'));
    });

    await expect(plugins$.toPromise()).resolves.toEqual([]);
    await expect(errors$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  "Error: Unexpected token o in JSON at position 1 (invalid-manifest, ${resolveForSnapshot(
    TEST_PATHS.paths.existentDir,
    'kibana.json'
  )})",
]
`);
  });

  test('return error when plugin id is missing', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(null, Buffer.from(JSON.stringify({ version: 'some-version' })));
    });

    await expect(plugins$.toPromise()).resolves.toEqual([]);
    await expect(errors$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  "Error: Plugin manifest must contain an \\"id\\" property. (invalid-manifest, ${resolveForSnapshot(
    TEST_PATHS.paths.existentDir,
    'kibana.json'
  )})",
]
`);
  });

  test('return error when plugin version is missing', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(null, Buffer.from(JSON.stringify({ id: 'some-id' })));
    });

    await expect(plugins$.toPromise()).resolves.toEqual([]);
    await expect(errors$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  "Error: Plugin manifest for \\"some-id\\" must contain a \\"version\\" property. (invalid-manifest, ${resolveForSnapshot(
    TEST_PATHS.paths.existentDir,
    'kibana.json'
  )})",
]
`);
  });

  test('return error when plugin expected Kibana version is lower than actual version', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: '6.4.2' })));
    });

    await expect(plugins$.toPromise()).resolves.toEqual([]);
    await expect(errors$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  "Error: Plugin \\"some-id\\" is only compatible with Kibana version \\"6.4.2\\", but used Kibana version is \\"7.0.0-alpha1\\". (incompatible-version, ${resolveForSnapshot(
    TEST_PATHS.paths.existentDir,
    'kibana.json'
  )})",
]
`);
  });

  test('return error when plugin expected Kibana version is higher than actual version', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: '7.0.1' })));
    });

    await expect(plugins$.toPromise()).resolves.toEqual([]);
    await expect(errors$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  "Error: Plugin \\"some-id\\" is only compatible with Kibana version \\"7.0.1\\", but used Kibana version is \\"7.0.0-alpha1\\". (incompatible-version, ${resolveForSnapshot(
    TEST_PATHS.paths.existentDir,
    'kibana.json'
  )})",
]
`);
  });

  test('set defaults for all missing optional fields', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: '7.0.0' })));
    });

    await expect(plugins$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  Object {
    "manifest": Object {
      "id": "some-id",
      "kibanaVersion": "7.0.0",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "7.0.0",
    },
    "path": "/projects/elastic/master/kibana/path/existent-dir",
  },
]
`);
    await expect(errors$.toPromise()).resolves.toEqual([]);
  });

  test('return all set optional fields as they are in manifest', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(
        null,
        Buffer.from(
          JSON.stringify({
            id: 'some-id',
            version: 'some-version',
            kibanaVersion: '7.0.0',
            requiredPlugins: ['some-required-plugin', 'some-required-plugin-2'],
            optionalPlugins: ['some-optional-plugin'],
            ui: true,
          })
        )
      );
    });

    await expect(plugins$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  Object {
    "manifest": Object {
      "id": "some-id",
      "kibanaVersion": "7.0.0",
      "optionalPlugins": Array [
        "some-optional-plugin",
      ],
      "requiredPlugins": Array [
        "some-required-plugin",
        "some-required-plugin-2",
      ],
      "ui": true,
      "version": "some-version",
    },
    "path": "${resolveForSnapshot(TEST_PATHS.paths.existentDir)}",
  },
]
`);
    await expect(errors$.toPromise()).resolves.toEqual([]);
  });

  test('return manifest when plugin expected Kibana version matches actual version', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(
        null,
        Buffer.from(
          JSON.stringify({
            id: 'some-id',
            version: 'some-version',
            kibanaVersion: '7.0.0-alpha2',
            requiredPlugins: ['some-required-plugin'],
          })
        )
      );
    });

    await expect(plugins$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  Object {
    "manifest": Object {
      "id": "some-id",
      "kibanaVersion": "7.0.0-alpha2",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [
        "some-required-plugin",
      ],
      "ui": false,
      "version": "some-version",
    },
    "path": "${resolveForSnapshot(TEST_PATHS.paths.existentDir)}",
  },
]
`);
    await expect(errors$.toPromise()).resolves.toEqual([]);
  });

  test('return manifest when plugin expected Kibana version is `kibana`', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(
        null,
        Buffer.from(
          JSON.stringify({
            id: 'some-id',
            version: 'some-version',
            kibanaVersion: 'kibana',
            requiredPlugins: ['some-required-plugin'],
          })
        )
      );
    });

    await expect(plugins$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  Object {
    "manifest": Object {
      "id": "some-id",
      "kibanaVersion": "kibana",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [
        "some-required-plugin",
      ],
      "ui": false,
      "version": "some-version",
    },
    "path": "${resolveForSnapshot(TEST_PATHS.paths.existentDir)}",
  },
]
`);
    await expect(errors$.toPromise()).resolves.toEqual([]);
  });
});
