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

import { of } from 'rxjs';
import { map, toArray } from 'rxjs/operators';
import { logger } from '../logging/__mocks__';
import { PluginsDiscovery } from './plugins_discovery';

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
});

afterEach(() => {
  jest.clearAllMocks();
});

test('properly scans folders and paths', async () => {
  const discovery = new PluginsDiscovery(logger.get());
  const { plugins$, errors$ } = discovery.discover(
    of({
      initialize: true,
      scanDirs: ['/scan/non-empty/', '/scan/non-existent/', '/scan/empty/', '/scan/non-empty-2/'],
      paths: ['/path/existent-dir', '/path/non-dir', '/path/non-existent', '/path/existent-dir-2'],
    })
  );

  await expect(plugins$.pipe(toArray()).toPromise()).resolves.toMatchInlineSnapshot(`
Array [
  Object {
    "manifest": Object {
      "id": "plugin",
      "version": "1",
    },
    "path": "/scan/non-empty/1",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
      "version": "1",
    },
    "path": "/scan/non-empty/3",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
      "version": "1",
    },
    "path": "/scan/non-empty-2/6",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
      "version": "1",
    },
    "path": "/path/existent-dir",
  },
  Object {
    "manifest": Object {
      "id": "plugin",
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
