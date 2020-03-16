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

import { Observable, merge, of } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { isDeepStrictEqual } from 'util';

import { ServiceStatus, ServiceStatusLevel } from '../status';
import { ElasticsearchStatusMeta } from './types';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';

export const calculateStatus$ = (
  esNodesCompatibility$: Observable<NodesVersionCompatibility>
): Observable<ServiceStatus<ElasticsearchStatusMeta>> =>
  merge(
    of({
      level: ServiceStatusLevel.unavailable,
      summary: `Waiting for Elasticsearch`,
    }),
    esNodesCompatibility$.pipe(
      map(
        ({
          isCompatible,
          message,
          incompatibleNodes,
          warningNodes,
        }): ServiceStatus<ElasticsearchStatusMeta> => {
          if (!isCompatible) {
            return {
              level: ServiceStatusLevel.critical,
              summary:
                // Message should always be present, but this is a safe fallback
                message ??
                `Some Elasticsearch nodes are not compatible with this version of Kibana`,
              meta: { warningNodes, incompatibleNodes },
            };
          } else if (warningNodes.length > 0) {
            return {
              level: ServiceStatusLevel.degraded,
              summary:
                // Message should always be present, but this is a safe fallback
                message ??
                `Some Elasticsearch nodes are running differnt versions than this version of Kibana`,
              meta: { warningNodes },
            };
          } else {
            return { level: ServiceStatusLevel.available, summary: `Elasticsearch is available` };
          }
        }
      )
    )
  ).pipe(distinctUntilChanged(isDeepStrictEqual));
