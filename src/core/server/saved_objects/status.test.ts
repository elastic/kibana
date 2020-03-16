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

import { of, Observable, Subject } from 'rxjs';
import { ServiceStatus, ServiceStatusLevel } from '../status';
import { calculateStatus$ } from './status';
import { take } from 'rxjs/operators';

describe('calculateStatus$', () => {
  const expectUnavailableDueToEs = (status$: Observable<ServiceStatus>) =>
    expect(status$.pipe(take(1)).toPromise()).resolves.toEqual({
      level: ServiceStatusLevel.unavailable,
      summary: `SavedObjects are not available without a healthy Elasticearch connection`,
    });

  const expectUnavailableDueToMigrations = (status$: Observable<ServiceStatus>) =>
    expect(status$.pipe(take(1)).toPromise()).resolves.toEqual({
      level: ServiceStatusLevel.unavailable,
      summary: `SavedObject indices are migrating`,
    });

  describe('when elasticsearch is unavailable', () => {
    const esStatus$ = of<ServiceStatus>({
      level: ServiceStatusLevel.unavailable,
      summary: 'xxx',
    });

    it('is unavailable before migrations have ran', async () => {
      await expectUnavailableDueToEs(calculateStatus$(of<any>(), esStatus$));
    });
    it('is unavailable after migrations have ran', async () => {
      await expectUnavailableDueToEs(calculateStatus$(of([{ status: 'skipped' }]), esStatus$));
    });
  });

  describe('when elasticsearch is critical', () => {
    const esStatus$ = of<ServiceStatus>({
      level: ServiceStatusLevel.critical,
      summary: 'xxx',
    });

    it('is unavailable before migrations have ran', async () => {
      await expectUnavailableDueToEs(calculateStatus$(of<any>(), esStatus$));
    });
    it('is unavailable after migrations have ran', async () => {
      await expectUnavailableDueToEs(
        calculateStatus$(
          of<any>([{ status: 'migrated' }]),
          esStatus$
        )
      );
    });
  });

  describe('when elasticsearch is available', () => {
    const esStatus$ = of<ServiceStatus>({ level: ServiceStatusLevel.available });

    it('is unavailable before migrations have ran', async () => {
      await expectUnavailableDueToMigrations(calculateStatus$(of<any>(), esStatus$));
    });
    it('is available after migrations have ran', async () => {
      await expect(
        calculateStatus$(
          of<any>([{ status: 'skipped' }, { status: 'patched' }]),
          esStatus$
        )
          .pipe(take(2))
          .toPromise()
      ).resolves.toEqual({
        level: ServiceStatusLevel.available,
        summary: `SavedObject indices have been migrated`,
        meta: {
          migratedIndices: {
            migrated: 0,
            patched: 1,
            skipped: 1,
          },
        },
      });
    });
  });

  describe('when elasticsearch is degraded', () => {
    const esStatus$ = of<ServiceStatus>({ level: ServiceStatusLevel.degraded, summary: 'xxx' });

    it('is unavailable before migrations have ran', async () => {
      await expectUnavailableDueToMigrations(calculateStatus$(of<any>(), esStatus$));
    });
    it('is degraded after migrations have ran', async () => {
      await expect(
        calculateStatus$(
          of<any>([{ status: 'skipped' }]),
          esStatus$
        )
          .pipe(take(2))
          .toPromise()
      ).resolves.toEqual({
        level: ServiceStatusLevel.degraded,
        summary: 'xxx',
      });
    });
  });

  it('does not emit duplicate statuses', () => {
    const esStatus$ = new Subject<ServiceStatus>();
    const migratorResult = new Subject<any>();

    const statusUpdates: ServiceStatus[] = [];
    const subscription = calculateStatus$(migratorResult, esStatus$).subscribe(status =>
      statusUpdates.push(status)
    );

    esStatus$.next({ level: ServiceStatusLevel.available });
    esStatus$.next({ level: ServiceStatusLevel.available });
    migratorResult.next([{ status: 'skipped' }]);
    migratorResult.next([{ status: 'skipped' }]);
    esStatus$.next({ level: ServiceStatusLevel.available });
    esStatus$.next({ level: ServiceStatusLevel.unavailable, summary: 'xxx' });
    esStatus$.next({ level: ServiceStatusLevel.unavailable, summary: 'xxx' });

    expect(statusUpdates.map(({ level, summary }) => ({ level, summary }))).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": 2,
          "summary": "SavedObject indices are migrating",
        },
        Object {
          "level": 0,
          "summary": "SavedObject indices have been migrated",
        },
        Object {
          "level": 2,
          "summary": "SavedObjects are not available without a healthy Elasticearch connection",
        },
      ]
    `);

    subscription.unsubscribe();
  });
});
