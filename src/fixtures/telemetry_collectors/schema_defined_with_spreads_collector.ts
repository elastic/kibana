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

interface MyObject {
  total: number;
  type: boolean;
}

interface Usage {
  flat?: string;
  my_str?: string;
  my_objects: MyObject;
}

const SOME_NUMBER: number = 123;

const someSchema: MakeSchemaFrom<Pick<Usage, 'flat' | 'my_str'>> = {
  flat: {
    type: 'keyword',
  },
  my_str: {
    type: 'text',
  },
};

const someOtherSchema: MakeSchemaFrom<Pick<Usage, 'my_objects'>> = {
  my_objects: {
    total: {
      type: 'long',
    },
    type: { type: 'boolean' },
  },
};

export const myCollector = makeUsageCollector<Usage>({
  type: 'schema_defined_with_spreads',
  isReady: () => true,
  fetch() {
    const testString = '123';

    return {
      flat: 'hello',
      my_str: testString,
      my_objects: {
        total: SOME_NUMBER,
        type: true,
      },
    };
  },
  schema: {
    ...someSchema,
    ...someOtherSchema,
  },
});
