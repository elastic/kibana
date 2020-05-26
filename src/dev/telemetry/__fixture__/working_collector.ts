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
import { CollectorSet } from '../../../plugins/usage_collection/server/collector';
import { loggingServiceMock } from '../../../core/server/mocks';

const { makeUsageCollector } = new CollectorSet({
  logger: loggingServiceMock.createLogger(),
  maximumWaitTimeForAllCollectorsInS: 0,
});

interface MyObject {
  total: number;
}

interface Usage {
  flat?: string;
  my_str?: string;
  my_objects: MyObject;
}

const SOME_NUMBER: number = 123;

export const myCollector = makeUsageCollector<Usage>({
  type: 'my_working_collector',
  isReady: () => true,
  fetch(): Usage {
    const testString = '123';
    // query ES and get some data

    // summarize the data into a model
    // return the modeled object that includes whatever you want to track
    try {
      return {
        flat: 'hello',
        my_str: testString,
        my_objects: {
          total: SOME_NUMBER,
        },
      };
    } catch (err) {
      return {
        my_objects: {
          total: 0,
        },
      };
    }
  },
  mapping: {
    flat: {
      type: 'keyword',
    },
    my_str: {
      type: 'text',
    },
    my_objects: {
      total: {
        type: 'number',
      },
    },
  },
});
