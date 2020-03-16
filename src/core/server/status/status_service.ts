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

/* eslint-disable max-classes-per-file */

import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CoreService } from '../../types';
import { ServiceStatus, CoreStatus, InternalStatusServiceSetup } from './types';
import { getSummaryStatus } from './utils';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { ElasticsearchStatusMeta } from '../elasticsearch';
import { SavedObjectStatusMeta } from '../saved_objects';

interface SetupDeps {
  coreStatuses: {
    elasticsearch$: Observable<ServiceStatus<ElasticsearchStatusMeta>>;
    savedObjects$: Observable<ServiceStatus<SavedObjectStatusMeta>>;
  };
}

export class StatusService implements CoreService<InternalStatusServiceSetup> {
  private readonly logger: Logger;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('status');
  }

  public setup({ coreStatuses }: SetupDeps) {
    const core$ = this.setupCoreStatus(coreStatuses);
    const overall$: Observable<ServiceStatus> = core$.pipe(
      map(coreStatus => {
        this.logger.debug('Recalculating overall status');
        return getSummaryStatus(coreStatus);
      })
    );

    return {
      core$,
      overall$,
    };
  }

  public start() {}

  public stop() {}

  private setupCoreStatus(coreStatuses: SetupDeps['coreStatuses']): Observable<CoreStatus> {
    return combineLatest(coreStatuses.elasticsearch$, coreStatuses.savedObjects$).pipe(
      map(([elasticsearch, savedObjects]) => ({
        elasticsearch,
        savedObjects,
      }))
    );
  }
}
