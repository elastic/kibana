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
import { BehaviorSubject } from 'rxjs';
import { UsageCollectionUsageCollector } from 'kibana/server';
import { loggerMock } from '../../core/server/logging/logger.mock';
import { CollectorSet } from '../../core/server/usage_collection/collector_set';

const collectorSet = new CollectorSet({
  logger: loggerMock.create(),
  maximumWaitTimeForAllCollectorsInS$: new BehaviorSubject(0),
});

interface Usage {
  locale?: string;
}

export class NestedInside {
  collector?: UsageCollectionUsageCollector<Usage, Usage>;
  createMyCollector() {
    this.collector = collectorSet.makeUsageCollector<Usage>({
      type: 'my_nested_collector',
      isReady: () => true,
      fetch: async () => {
        return {
          locale: 'en',
        };
      },
      schema: {
        locale: {
          type: 'keyword',
        },
      },
    });
  }
}
