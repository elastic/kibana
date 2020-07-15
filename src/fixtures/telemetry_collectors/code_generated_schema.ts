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
import { CollectorSet, MakeSchemaFrom } from '../../plugins/usage_collection/server/collector';
import { loggerMock } from '../../core/server/logging/logger.mock';

const { makeUsageCollector } = new CollectorSet({
  logger: loggerMock.create(),
  maximumWaitTimeForAllCollectorsInS: 0,
});

interface Usage {
  locale?: string;
  something: { nested: boolean };
}

function getSchema(): MakeSchemaFrom<Required<Usage>> {
  return {
    locale: { type: 'keyword' },
    something: {
      nested: { type: 'boolean' },
    },
  };
}

// const schemaVal = getSchema();

export const myCollector = makeUsageCollector<Usage>({
  type: 'code_generated_schema',
  isReady: () => true,
  schema: getSchema(),
  fetch: () => {
    return {
      locale: 'en',
      something: { nested: true },
    };
  },
});
