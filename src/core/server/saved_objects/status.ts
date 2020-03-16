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

import { Observable, combineLatest } from 'rxjs';
import { startWith, map, distinctUntilChanged } from 'rxjs/operators';
import { isDeepStrictEqual } from 'util';
import { ServiceStatus, ServiceStatusLevel } from '../status';
import { MigrationResult } from './migrations';
import { SavedObjectStatusMeta } from './types';

export const calculateStatus$ = (
  migratorResult$: Observable<MigrationResult[]>,
  elasticsearchStatus$: Observable<ServiceStatus>
): Observable<ServiceStatus<SavedObjectStatusMeta>> => {
  const migratorStatus$: Observable<ServiceStatus<SavedObjectStatusMeta>> = migratorResult$.pipe(
    map(migrationResult => {
      const skipped = migrationResult.filter(({ status }) => status === 'skipped').length;
      const patched = migrationResult.filter(({ status }) => status === 'patched').length;
      const migrated = migrationResult.filter(({ status }) => status === 'migrated').length;

      return {
        level: ServiceStatusLevel.available,
        summary: `SavedObject indices have been migrated`,
        meta: {
          migratedIndices: {
            skipped,
            patched,
            migrated,
          },
        },
      };
    }),
    startWith({
      level: ServiceStatusLevel.unavailable,
      summary: `SavedObject indices are migrating`,
    })
  );

  return combineLatest(elasticsearchStatus$, migratorStatus$).pipe(
    map(([esStatus, migratorStatus]) => {
      if (esStatus.level >= ServiceStatusLevel.unavailable) {
        return {
          level: ServiceStatusLevel.unavailable,
          summary: `SavedObjects are not available without a healthy Elasticearch connection`,
        };
      } else if (migratorStatus.level === ServiceStatusLevel.unavailable) {
        return migratorStatus;
      } else if (esStatus.level === ServiceStatusLevel.degraded) {
        return {
          level: esStatus.level,
          summary: esStatus.summary,
        };
      } else {
        return migratorStatus;
      }
    }),
    distinctUntilChanged(isDeepStrictEqual)
  );
};
