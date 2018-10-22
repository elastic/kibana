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

import { Observable } from 'rxjs';
import { map, toArray } from 'rxjs/operators';
import { logger } from '../logging/__mocks__';
import { PluginManifest, PluginsDiscovery } from './plugins_discovery';

let discovery: PluginsDiscovery;
beforeEach(() => {
  mockReaddir.mockImplementation((path, cb) => {
    if (path === '/scan/non-empty/') {
      cb(null, ['1', '2-no-manifest', '3', '4-incomplete-manifest']);
    } else if (path === '/scan/non-empty-2/') {
      cb(null, ['5-invalid-manifest', '6', '7-non-dir']);
    } else if (path.includes('non-existent')) {
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
    if (path.endsWith('no-manifest/kibana.json')) {
      cb(new Error('ENOENT'));
    } else if (path.endsWith('invalid-manifest/kibana.json')) {
      cb(null, Buffer.from('not-json'));
    } else if (path.endsWith('incomplete-manifest/kibana.json')) {
      cb(null, Buffer.from(JSON.stringify({ version: '1' })));
    } else {
      cb(null, Buffer.from(JSON.stringify({ id: 'plugin', version: '1' })));
    }
  });

  discovery = new PluginsDiscovery(logger.get());
});

afterEach(() => {
  jest.clearAllMocks();
});

test('properly scans folders and paths', async () => {
  const { plugins$, errors$ } = discovery.discover({
    initialize: true,
    scanDirs: ['/scan/non-empty/', '/scan/non-existent/', '/scan/empty/', '/scan/non-empty-2/'],
    paths: ['/path/existent-dir', '/path/non-dir', '/path/non-existent', '/path/existent-dir-2'],
  });

  await expect(plugins$.pipe(toArray()).toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  Object {
    "manifest": Object {
      "id": "plugin",
      "kibanaVersion": "1",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "1",
    },
    "path": "/scan/non-empty/1",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
      "kibanaVersion": "1",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "1",
    },
    "path": "/scan/non-empty/3",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
      "kibanaVersion": "1",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "1",
    },
    "path": "/scan/non-empty-2/6",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
      "kibanaVersion": "1",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "1",
    },
    "path": "/path/existent-dir",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
      "kibanaVersion": "1",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "1",
    },
    "path": "/path/existent-dir-2",
  },
]
`);

  await expect(
    errors$
      .pipe(
        map(error => error.toString()),
        toArray()
      )
      .toPromise()
  ).resolves.toMatchInlineSnapshot(`
Array [
  "Error: ENOENT (missing-manifest, /scan/non-empty/2-no-manifest/kibana.json)",
  "Error: The \\"id\\" or/and \\"version\\" is missing in the plugin manifest. (invalid-manifest, /scan/non-empty/4-incomplete-manifest/kibana.json)",
  "Error: ENOENT (invalid-scan-dir, /scan/non-existent/)",
  "Error: Unexpected token o in JSON at position 1 (invalid-manifest, /scan/non-empty-2/5-invalid-manifest/kibana.json)",
  "Error: /path/non-dir is not a directory. (invalid-plugin-dir, /path/non-dir)",
  "Error: ENOENT (invalid-plugin-dir, /path/non-existent)",
]
`);
});

describe('parsing plugin manifest', () => {
  let plugins$: Observable<Array<{ path: string; manifest: PluginManifest }>>;
  let errors$: Observable<string[]>;
  beforeEach(async () => {
    const discoveryResult = discovery.discover({
      initialize: true,
      scanDirs: [],
      paths: ['/path/existent-dir'],
    });

    plugins$ = discoveryResult.plugins$.pipe(toArray());
    errors$ = discoveryResult.errors$.pipe(
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
  "Error: Unexpected end of JSON input (invalid-manifest, /path/existent-dir/kibana.json)",
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
  "Error: The \\"id\\" or/and \\"version\\" is missing in the plugin manifest. (invalid-manifest, /path/existent-dir/kibana.json)",
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
  "Error: Unexpected token o in JSON at position 1 (invalid-manifest, /path/existent-dir/kibana.json)",
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
  "Error: The \\"id\\" or/and \\"version\\" is missing in the plugin manifest. (invalid-manifest, /path/existent-dir/kibana.json)",
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
  "Error: The \\"id\\" or/and \\"version\\" is missing in the plugin manifest. (invalid-manifest, /path/existent-dir/kibana.json)",
]
`);
  });

  test('set defaults for all missing optional fields', async () => {
    mockReadFile.mockImplementation((path, cb) => {
      cb(null, Buffer.from(JSON.stringify({ id: 'some-id', version: 'some-version' })));
    });

    await expect(plugins$.toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  Object {
    "manifest": Object {
      "id": "some-id",
      "kibanaVersion": "some-version",
      "optionalPlugins": Array [],
      "requiredPlugins": Array [],
      "ui": false,
      "version": "some-version",
    },
    "path": "/path/existent-dir",
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
            kibanaVersion: 'some-kibana-version',
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
      "kibanaVersion": "some-kibana-version",
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
    "path": "/path/existent-dir",
  },
]
`);
    await expect(errors$.toPromise()).resolves.toEqual([]);
  });
});
