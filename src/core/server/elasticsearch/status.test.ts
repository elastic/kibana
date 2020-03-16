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

import { take } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

import { calculateStatus$ } from './status';
import { ServiceStatusLevel, ServiceStatus } from '../status';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';

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
    expect(
      await calculateStatus$(new Subject())
        .pipe(take(1))
        .toPromise()
    ).toEqual({
      level: ServiceStatusLevel.unavailable,
      summary: 'Waiting for Elasticsearch',
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
      level: ServiceStatusLevel.available,
      summary: 'Elasticsearch is available',
    });
  });

  it('changes to degraded when isCompatible and warningNodes present', async () => {
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
      level: ServiceStatusLevel.degraded,
      summary: 'Some nodes are a different version',
      meta: {
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
      level: ServiceStatusLevel.critical,
      summary: 'Incompatible with Elasticsearch',
      meta: {
        warningNodes: [nodeInfo],
        incompatibleNodes: [nodeInfo],
      },
    });
  });

  it('emits status updates when node compatibility changes', () => {
    const nodeCompat$ = new Subject<NodesVersionCompatibility>();

    const statusUpdates: ServiceStatus[] = [];
    const subscription = calculateStatus$(nodeCompat$).subscribe(status =>
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

    expect(statusUpdates.map(({ level, summary }) => ({ level, summary }))).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": 2,
          "summary": "Waiting for Elasticsearch",
        },
        Object {
          "level": 3,
          "summary": "Unable to retrieve version info",
        },
        Object {
          "level": 3,
          "summary": "Incompatible with Elasticsearch",
        },
        Object {
          "level": 1,
          "summary": "Some nodes are incompatible",
        },
        Object {
          "level": 0,
          "summary": "Elasticsearch is available",
        },
      ]
    `);

    subscription.unsubscribe();
  });

  it('does not emit duplicate status updates', () => {
    const nodeCompat$ = new Subject<NodesVersionCompatibility>();

    const statusUpdates: ServiceStatus[] = [];
    const subscription = calculateStatus$(nodeCompat$).subscribe(status =>
      statusUpdates.push(status)
    );

    nodeCompat$.next({
      isCompatible: false,
      kibanaVersion: '2.1.1',
      incompatibleNodes: [nodeInfo],
      warningNodes: [],
      message: 'Incompatible with Elasticsearch',
    });
    nodeCompat$.next({
      isCompatible: false,
      kibanaVersion: '2.1.1',
      incompatibleNodes: [nodeInfo],
      warningNodes: [],
      message: 'Incompatible with Elasticsearch',
    });
    nodeCompat$.next({
      isCompatible: false,
      kibanaVersion: '2.1.1',
      incompatibleNodes: [nodeInfo],
      warningNodes: [],
      message: 'Incompatible with Elasticsearch',
    });

    expect(statusUpdates.map(({ level, summary }) => ({ level, summary }))).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": 2,
          "summary": "Waiting for Elasticsearch",
        },
        Object {
          "level": 3,
          "summary": "Incompatible with Elasticsearch",
        },
      ]
    `);
    subscription.unsubscribe();
  });
});
