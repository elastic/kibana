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
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { isDeepStrictEqual } from 'util';

import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { InternalElasticsearchServiceSetup } from '../elasticsearch';
import { InternalSavedObjectsServiceSetup } from '../saved_objects';

import { ServiceStatus, CoreStatus, InternalStatusServiceSetup } from './types';
import { getSummaryStatus } from './get_summary_status';

interface SetupDeps {
  elasticsearch: Pick<InternalElasticsearchServiceSetup, 'status$'>;
  savedObjects: Pick<InternalSavedObjectsServiceSetup, 'status$'>;
}

export class StatusService implements CoreService<InternalStatusServiceSetup> {
  private readonly logger: Logger;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('status');
  }

  public setup(core: SetupDeps) {
    const core$ = this.setupCoreStatus(core);
    const overall$: Observable<ServiceStatus> = core$.pipe(
      map((coreStatus) => {
        const summary = getSummaryStatus(Object.entries(coreStatus));
        this.logger.debug(`Recalculated overall status`, { status: summary });
        return summary;
      }),
      distinctUntilChanged(isDeepStrictEqual)
    );

    return {
      core$,
      overall$,
    };
  }

  public start() {}

  public stop() {}

  private setupCoreStatus({ elasticsearch, savedObjects }: SetupDeps): Observable<CoreStatus> {
    return combineLatest([elasticsearch.status$, savedObjects.status$]).pipe(
      map(([elasticsearchStatus, savedObjectsStatus]) => ({
        elasticsearch: elasticsearchStatus,
        savedObjects: savedObjectsStatus,
      })),
      distinctUntilChanged(isDeepStrictEqual),
      shareReplay(1)
    );
  }
}
