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

import { of, Observable } from 'rxjs';
import { ServiceStatus, ServiceStatusLevels } from '../status';
import { calculateStatus$ } from './status';
import { take } from 'rxjs/operators';

describe('calculateStatus$', () => {
  const expectUnavailableDueToEs = (status$: Observable<ServiceStatus>) =>
    expect(status$.pipe(take(1)).toPromise()).resolves.toEqual({
      level: ServiceStatusLevels.unavailable,
      summary: `SavedObjects service is not available without a healthy Elasticearch connection`,
    });

  const expectUnavailableDueToMigrations = (status$: Observable<ServiceStatus>) =>
    expect(status$.pipe(take(1)).toPromise()).resolves.toEqual({
      level: ServiceStatusLevels.unavailable,
      summary: `SavedObjects service is waiting to start migrations`,
    });

  describe('when elasticsearch is unavailable', () => {
    const esStatus$ = of<ServiceStatus>({
      level: ServiceStatusLevels.unavailable,
      summary: 'xxx',
    });

    it('is unavailable before migrations have ran', async () => {
      await expectUnavailableDueToEs(calculateStatus$(of<any>(), esStatus$));
    });
    it('is unavailable after migrations have ran', async () => {
      await expectUnavailableDueToEs(
        calculateStatus$(of({ status: 'completed', result: [] }), esStatus$)
      );
    });
  });

  describe('when elasticsearch is critical', () => {
    const esStatus$ = of<ServiceStatus>({
      level: ServiceStatusLevels.critical,
      summary: 'xxx',
    });

    it('is unavailable before migrations have ran', async () => {
      await expectUnavailableDueToEs(calculateStatus$(of<any>(), esStatus$));
    });
    it('is unavailable after migrations have ran', async () => {
      await expectUnavailableDueToEs(
        calculateStatus$(
          of({ status: 'completed', result: [{ status: 'migrated' } as any] }),
          esStatus$
        )
      );
    });
  });

  describe('when elasticsearch is available', () => {
    const esStatus$ = of<ServiceStatus>({
      level: ServiceStatusLevels.available,
      summary: 'Available',
    });

    it('is unavailable before migrations have ran', async () => {
      await expectUnavailableDueToMigrations(calculateStatus$(of<any>(), esStatus$));
    });
    it('is unavailable while migrations are running', async () => {
      await expect(
        calculateStatus$(of({ status: 'running' }), esStatus$)
          .pipe(take(2))
          .toPromise()
      ).resolves.toEqual({
        level: ServiceStatusLevels.unavailable,
        summary: `SavedObjects service is running migrations`,
      });
    });
    it('is available after migrations have ran', async () => {
      await expect(
        calculateStatus$(
          of({ status: 'completed', result: [{ status: 'skipped' }, { status: 'patched' }] }),
          esStatus$
        )
          .pipe(take(2))
          .toPromise()
      ).resolves.toEqual({
        level: ServiceStatusLevels.available,
        summary: `SavedObjects service has completed migrations and is available`,
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
    const esStatus$ = of<ServiceStatus>({ level: ServiceStatusLevels.degraded, summary: 'xxx' });

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
        level: ServiceStatusLevels.degraded,
        summary: 'SavedObjects service is degraded due to Elasticsearch: [xxx]',
      });
    });
  });
});
