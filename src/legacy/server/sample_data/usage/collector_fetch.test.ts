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

import sinon from 'sinon';
import { fetchProvider } from './collector_fetch';

describe('Sample Data Fetch', () => {
  let callClusterMock: sinon.SinonStub;

  beforeEach(() => {
    callClusterMock = sinon.stub();
  });

  test('uninitialized .kibana', async () => {
    const fetch = fetchProvider('index');
    const telemetry = await fetch(callClusterMock);

    expect(telemetry).toMatchInlineSnapshot(`undefined`);
  });

  test('installed data set', async () => {
    const fetch = fetchProvider('index');
    callClusterMock.returns({
      hits: {
        hits: [
          {
            _id: 'sample-data-telemetry:test1',
            _source: {
              updated_at: '2019-03-13T22:02:09Z',
              'sample-data-telemetry': { installCount: 1 },
            },
          },
        ],
      },
    });
    const telemetry = await fetch(callClusterMock);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "installed": Array [
    "test1",
  ],
  "last_install_date": "2019-03-13T22:02:09.000Z",
  "last_install_set": "test1",
  "last_uninstall_date": null,
  "last_uninstall_set": null,
  "uninstalled": Array [],
}
`);
  });

  test('multiple installed data sets', async () => {
    const fetch = fetchProvider('index');
    callClusterMock.returns({
      hits: {
        hits: [
          {
            _id: 'sample-data-telemetry:test1',
            _source: {
              updated_at: '2019-03-13T22:02:09Z',
              'sample-data-telemetry': { installCount: 1 },
            },
          },
          {
            _id: 'sample-data-telemetry:test2',
            _source: {
              updated_at: '2019-03-13T22:13:17Z',
              'sample-data-telemetry': { installCount: 1 },
            },
          },
        ],
      },
    });
    const telemetry = await fetch(callClusterMock);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "installed": Array [
    "test1",
    "test2",
  ],
  "last_install_date": "2019-03-13T22:13:17.000Z",
  "last_install_set": "test2",
  "last_uninstall_date": null,
  "last_uninstall_set": null,
  "uninstalled": Array [],
}
`);
  });

  test('installed data set, missing counts', async () => {
    const fetch = fetchProvider('index');
    callClusterMock.returns({
      hits: {
        hits: [
          {
            _id: 'sample-data-telemetry:test1',
            _source: { updated_at: '2019-03-13T22:02:09Z', 'sample-data-telemetry': {} },
          },
        ],
      },
    });
    const telemetry = await fetch(callClusterMock);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "installed": Array [],
  "last_install_date": null,
  "last_install_set": null,
  "last_uninstall_date": null,
  "last_uninstall_set": null,
  "uninstalled": Array [],
}
`);
  });

  test('installed and uninstalled data sets', async () => {
    const fetch = fetchProvider('index');
    callClusterMock.returns({
      hits: {
        hits: [
          {
            _id: 'sample-data-telemetry:test0',
            _source: {
              updated_at: '2019-03-13T22:29:32Z',
              'sample-data-telemetry': { installCount: 4, unInstallCount: 4 },
            },
          },
          {
            _id: 'sample-data-telemetry:test1',
            _source: {
              updated_at: '2019-03-13T22:02:09Z',
              'sample-data-telemetry': { installCount: 1 },
            },
          },
          {
            _id: 'sample-data-telemetry:test2',
            _source: {
              updated_at: '2019-03-13T22:13:17Z',
              'sample-data-telemetry': { installCount: 1 },
            },
          },
        ],
      },
    });
    const telemetry = await fetch(callClusterMock);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "installed": Array [
    "test1",
    "test2",
  ],
  "last_install_date": "2019-03-13T22:13:17.000Z",
  "last_install_set": "test2",
  "last_uninstall_date": "2019-03-13T22:29:32.000Z",
  "last_uninstall_set": "test0",
  "uninstalled": Array [
    "test0",
  ],
}
`);
  });
});
