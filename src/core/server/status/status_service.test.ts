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

import { of } from 'rxjs';

import { ServiceStatus, ServiceStatusLevel } from './types';
import { StatusService } from './status_service';
import { first } from 'rxjs/operators';
import { mockCoreContext } from '../core_context.mock';

describe('StatusService', () => {
  const available: ServiceStatus<any> = { level: ServiceStatusLevel.available };
  const degraded: ServiceStatus<any> = {
    level: ServiceStatusLevel.degraded,
    summary: 'This is degraded!',
  };

  describe('setup', () => {
    it('rolls up core status observables into single observable', async () => {
      const setup = new StatusService(mockCoreContext.create()).setup({
        coreStatuses: {
          elasticsearch$: of(available),
          savedObjects$: of(degraded),
        },
      });
      expect(await setup.core$.pipe(first()).toPromise()).toEqual({
        elasticsearch: available,
        savedObjects: degraded,
      });
    });

    it('exposes an overall summary', async () => {
      const setup = new StatusService(mockCoreContext.create()).setup({
        coreStatuses: {
          elasticsearch$: of(degraded),
          savedObjects$: of(degraded),
        },
      });
      expect(await setup.overall$.pipe(first()).toPromise()).toMatchObject({
        level: ServiceStatusLevel.degraded,
        summary: '[2] services are degraded',
      });
    });
  });
});
