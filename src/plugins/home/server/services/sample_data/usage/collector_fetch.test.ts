/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CollectorFetchContext } from 'src/plugins/usage_collection/server';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';
import { fetchProvider } from './collector_fetch';

const getMockFetchClients = (hits?: unknown[]) => {
  const fetchParamsMock = createCollectorFetchContextMock();
  fetchParamsMock.esClient.search = jest.fn().mockResolvedValue({ hits: { hits } });
  return fetchParamsMock;
};

describe('Sample Data Fetch', () => {
  let collectorFetchContext: CollectorFetchContext;

  test('uninitialized .kibana', async () => {
    const fetch = fetchProvider('index');
    collectorFetchContext = getMockFetchClients();
    const telemetry = await fetch(collectorFetchContext);

    expect(telemetry).toMatchInlineSnapshot(`undefined`);
  });

  test('installed data set', async () => {
    const fetch = fetchProvider('index');
    collectorFetchContext = getMockFetchClients([
      {
        _id: 'sample-data-telemetry:test1',
        _source: {
          updated_at: '2019-03-13T22:02:09Z',
          'sample-data-telemetry': { installCount: 1 },
        },
      },
    ]);
    const telemetry = await fetch(collectorFetchContext);

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
    collectorFetchContext = getMockFetchClients([
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
    ]);
    const telemetry = await fetch(collectorFetchContext);

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
    collectorFetchContext = getMockFetchClients([
      {
        _id: 'sample-data-telemetry:test1',
        _source: { updated_at: '2019-03-13T22:02:09Z', 'sample-data-telemetry': {} },
      },
    ]);
    const telemetry = await fetch(collectorFetchContext);

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
    collectorFetchContext = getMockFetchClients([
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
    ]);
    const telemetry = await fetch(collectorFetchContext);

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
