/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of, Observable } from 'rxjs';
import { type ServiceStatus, ServiceStatusLevels } from '@kbn/core-status-common';
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
          of({
            status: 'completed',
            result: [
              { status: 'skipped' },
              { status: 'patched', destIndex: '.kibana', elapsedMs: 28 },
            ],
          }),
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
        calculateStatus$(of<any>([{ status: 'skipped' }]), esStatus$)
          .pipe(take(2))
          .toPromise()
      ).resolves.toEqual({
        level: ServiceStatusLevels.degraded,
        summary: 'SavedObjects service is degraded due to Elasticsearch: [xxx]',
      });
    });
  });
});
