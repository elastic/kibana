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

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';

import { CollectorSet, UsageCollectionCollectorSet } from './collector_set';
import { config, UsageCollectionServiceConfigType } from './config';

/**
 * @public
 */
export type UsageCollectionSetup = Pick<
  UsageCollectionCollectorSet,
  | 'makeStatsCollector'
  | 'makeUsageCollector'
  | 'registerCollector'
  | 'areAllCollectorsReady'
  | 'bulkFetchUsage'
  | 'toObject'
  | 'toApiFieldNames'
  | 'getFilteredCollectorSet'
  | 'isUsageCollector'
  | 'getCollectorByType'
>;

export class UsageCollectionService implements CoreService<UsageCollectionSetup, void> {
  private readonly logger: Logger;
  private readonly config$: Observable<UsageCollectionServiceConfigType>;
  private readonly collectorSet: CollectorSet;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('usage-collection');
    this.config$ = coreContext.configService.atPath(config.path);
    this.collectorSet = new CollectorSet({
      logger: this.logger.get('collector-set'),
      maximumWaitTimeForAllCollectorsInS$: this.config$.pipe(
        map((cfg) => cfg.maximumWaitTimeForAllCollectorsInS)
      ),
    });
  }

  public setup() {
    return {
      makeStatsCollector: this.collectorSet.makeStatsCollector,
      makeUsageCollector: this.collectorSet.makeUsageCollector,
      registerCollector: this.collectorSet.registerCollector,
      // Most of these below may be removed when bulk_uploader.js and register_stats.js are revisited for monitoring
      isUsageCollector: this.collectorSet.isUsageCollector,
      areAllCollectorsReady: this.collectorSet.areAllCollectorsReady,
      bulkFetchUsage: this.collectorSet.bulkFetchUsage,
      toObject: this.collectorSet.toObject,
      toApiFieldNames: this.collectorSet.toApiFieldNames,
      getFilteredCollectorSet: this.collectorSet.getFilteredCollectorSet,
      getCollectorByType: this.collectorSet.getCollectorByType,
    };
  }

  public start() {
    this.collectorSet.start();
  }
  public stop() {
    this.collectorSet.stop();
  }
}
