/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { take } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

import { calculateStatus$ } from './status';
import { ServiceStatusLevels, ServiceStatus } from '../status';
import { ServiceStatusLevelSnapshotSerializer } from '../status/test_utils';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';

expect.addSnapshotSerializer(ServiceStatusLevelSnapshotSerializer);

const nodeInfo = {
  version: '1.1.1',
  ip: '1.1.1.1',
  http: {
    publish_address: 'https://1.1.1.1:9200',
  },
  name: 'node1',
};

describe('calculateStatus', () => {
  it('starts in unavailable', async () => {
    expect(await calculateStatus$(new Subject()).pipe(take(1)).toPromise()).toEqual({
      level: ServiceStatusLevels.unavailable,
      summary: 'Waiting for Elasticsearch',
      meta: {
        warningNodes: [],
        incompatibleNodes: [],
      },
    });
  });

  it('changes to available when isCompatible and no warningNodes', async () => {
    expect(
      await calculateStatus$(
        of({ isCompatible: true, kibanaVersion: '1.1.1', warningNodes: [], incompatibleNodes: [] })
      )
        .pipe(take(2))
        .toPromise()
    ).toEqual({
      level: ServiceStatusLevels.available,
      summary: 'Elasticsearch is available',
      meta: {
        warningNodes: [],
        incompatibleNodes: [],
      },
    });
  });

  it('changes to available with a differemnt message when isCompatible and warningNodes present', async () => {
    expect(
      await calculateStatus$(
        of({
          isCompatible: true,
          kibanaVersion: '1.1.1',
          warningNodes: [nodeInfo],
          incompatibleNodes: [],
          // this isn't the real message, just used to test that the message
          // is forwarded to the status
          message: 'Some nodes are a different version',
        })
      )
        .pipe(take(2))
        .toPromise()
    ).toEqual({
      level: ServiceStatusLevels.available,
      summary: 'Some nodes are a different version',
      meta: {
        incompatibleNodes: [],
        warningNodes: [nodeInfo],
      },
    });
  });

  it('changes to critical when isCompatible is false', async () => {
    expect(
      await calculateStatus$(
        of({
          isCompatible: false,
          kibanaVersion: '2.1.1',
          warningNodes: [nodeInfo],
          incompatibleNodes: [nodeInfo],
          // this isn't the real message, just used to test that the message
          // is forwarded to the status
          message: 'Incompatible with Elasticsearch',
        })
      )
        .pipe(take(2))
        .toPromise()
    ).toEqual({
      level: ServiceStatusLevels.critical,
      summary: 'Incompatible with Elasticsearch',
      meta: {
        incompatibleNodes: [nodeInfo],
        warningNodes: [nodeInfo],
      },
    });
  });

  it('emits status updates when node compatibility changes', () => {
    const nodeCompat$ = new Subject<NodesVersionCompatibility>();

    const statusUpdates: ServiceStatus[] = [];
    const subscription = calculateStatus$(nodeCompat$).subscribe((status) =>
      statusUpdates.push(status)
    );

    nodeCompat$.next({
      isCompatible: false,
      kibanaVersion: '2.1.1',
      incompatibleNodes: [],
      warningNodes: [],
      message: 'Unable to retrieve version info',
    });
    nodeCompat$.next({
      isCompatible: false,
      kibanaVersion: '2.1.1',
      incompatibleNodes: [nodeInfo],
      warningNodes: [],
      message: 'Incompatible with Elasticsearch',
    });
    nodeCompat$.next({
      isCompatible: true,
      kibanaVersion: '1.1.1',
      warningNodes: [nodeInfo],
      incompatibleNodes: [],
      message: 'Some nodes are incompatible',
    });
    nodeCompat$.next({
      isCompatible: true,
      kibanaVersion: '1.1.1',
      warningNodes: [],
      incompatibleNodes: [],
    });

    subscription.unsubscribe();
    expect(statusUpdates).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": unavailable,
          "meta": Object {
            "incompatibleNodes": Array [],
            "warningNodes": Array [],
          },
          "summary": "Waiting for Elasticsearch",
        },
        Object {
          "level": critical,
          "meta": Object {
            "incompatibleNodes": Array [],
            "warningNodes": Array [],
          },
          "summary": "Unable to retrieve version info",
        },
        Object {
          "level": critical,
          "meta": Object {
            "incompatibleNodes": Array [
              Object {
                "http": Object {
                  "publish_address": "https://1.1.1.1:9200",
                },
                "ip": "1.1.1.1",
                "name": "node1",
                "version": "1.1.1",
              },
            ],
            "warningNodes": Array [],
          },
          "summary": "Incompatible with Elasticsearch",
        },
        Object {
          "level": available,
          "meta": Object {
            "incompatibleNodes": Array [],
            "warningNodes": Array [
              Object {
                "http": Object {
                  "publish_address": "https://1.1.1.1:9200",
                },
                "ip": "1.1.1.1",
                "name": "node1",
                "version": "1.1.1",
              },
            ],
          },
          "summary": "Some nodes are incompatible",
        },
        Object {
          "level": available,
          "meta": Object {
            "incompatibleNodes": Array [],
            "warningNodes": Array [],
          },
          "summary": "Elasticsearch is available",
        },
      ]
    `);
  });
});
