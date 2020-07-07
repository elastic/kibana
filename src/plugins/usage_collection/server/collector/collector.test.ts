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

import { loggingSystemMock } from '../../../../core/server/mocks';
import { Collector } from './collector';

const logger = loggingSystemMock.createLogger();

describe('collector', () => {
  describe('options validations', () => {
    it('should not accept an empty object', () => {
      // @ts-expect-error
      expect(() => new Collector(logger, {})).toThrowError(
        'Collector must be instantiated with a options.type string property'
      );
    });

    it('should be OK with all mandatory properties', () => {
      const collector = new Collector(logger, {
        type: 'my_test_collector',
        isReady: () => false,
        fetch: () => ({ testPass: 100 }),
        schema: {
          testPass: { type: 'long' },
        },
      });
      expect(collector).toBeDefined();
    });

    it('should be OK with arrays returned by fetch but object-schema', () => {
      const collector = new Collector(logger, {
        type: 'my_test_collector',
        isReady: () => false,
        fetch: () => ({ testPass: [{ name: 'a', value: 100 }] }),
        schema: {
          testPass: { name: { type: 'keyword' }, value: { type: 'long' } },
        },
      });
      expect(collector).toBeDefined();
    });
  });
});
