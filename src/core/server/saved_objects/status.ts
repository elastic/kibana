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
import { startWith, map } from 'rxjs/operators';
import { ServiceStatus, ServiceStatusLevels } from '../status';
import { SavedObjectStatusMeta } from './types';
import { KibanaMigratorStatus } from './migrations/kibana';

export const calculateStatus$ = (
  rawMigratorStatus$: Observable<KibanaMigratorStatus>,
  elasticsearchStatus$: Observable<ServiceStatus>
): Observable<ServiceStatus<SavedObjectStatusMeta>> => {
  const migratorStatus$: Observable<ServiceStatus<SavedObjectStatusMeta>> = rawMigratorStatus$.pipe(
    map((migrationStatus) => {
      if (migrationStatus.status === 'waiting') {
        return {
          level: ServiceStatusLevels.unavailable,
          summary: `SavedObjects service is waiting to start migrations`,
        };
      } else if (migrationStatus.status === 'running') {
        return {
          level: ServiceStatusLevels.unavailable,
          summary: `SavedObjects service is running migrations`,
        };
      }

      const statusCounts: SavedObjectStatusMeta['migratedIndices'] = { migrated: 0, skipped: 0 };
      if (migrationStatus.result) {
        migrationStatus.result.forEach(({ status }) => {
          statusCounts[status] = (statusCounts[status] ?? 0) + 1;
        });
      }

      return {
        level: ServiceStatusLevels.available,
        summary: `SavedObjects service has completed migrations and is available`,
        meta: {
          migratedIndices: statusCounts,
        },
      };
    }),
    startWith({
      level: ServiceStatusLevels.unavailable,
      summary: `SavedObjects service is waiting to start migrations`,
    })
  );

  return combineLatest([elasticsearchStatus$, migratorStatus$]).pipe(
    map(([esStatus, migratorStatus]) => {
      if (esStatus.level >= ServiceStatusLevels.unavailable) {
        return {
          level: ServiceStatusLevels.unavailable,
          summary: `SavedObjects service is not available without a healthy Elasticearch connection`,
        };
      } else if (migratorStatus.level === ServiceStatusLevels.unavailable) {
        return migratorStatus;
      } else if (esStatus.level === ServiceStatusLevels.degraded) {
        return {
          level: esStatus.level,
          summary: `SavedObjects service is degraded due to Elasticsearch: [${esStatus.summary}]`,
        };
      } else {
        return migratorStatus;
      }
    })
  );
};
