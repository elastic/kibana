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
import { UsageCollector } from './usage_collector';

const logger = loggingSystemMock.createLogger();

describe('collector', () => {
  describe('options validations', () => {
    it('should not accept an empty object', () => {
      // @ts-expect-error
      expect(() => new Collector(logger, {})).toThrowError(
        'Collector must be instantiated with a options.type string property'
      );
    });

    it('should fail if init is not a function', () => {
      expect(
        () =>
          new Collector(logger, {
            type: 'my_test_collector',
            // @ts-expect-error
            init: 1,
          })
      ).toThrowError(
        'If init property is passed, Collector must be instantiated with a options.init as a function property'
      );
    });

    it('should fail if fetch is not defined', () => {
      expect(
        () =>
          // @ts-expect-error
          new Collector(logger, {
            type: 'my_test_collector',
            isReady: () => false,
          })
      ).toThrowError('Collector must be instantiated with a options.fetch function property');
    });

    it('should fail if fetch is not a function', () => {
      expect(
        () =>
          new Collector(logger, {
            type: 'my_test_collector',
            isReady: () => false,
            // @ts-expect-error
            fetch: 1,
          })
      ).toThrowError('Collector must be instantiated with a options.fetch function property');
    });

    it('should be OK with all mandatory properties', () => {
      const collector = new Collector(logger, {
        type: 'my_test_collector',
        isReady: () => false,
        fetch: () => ({ testPass: 100 }),
      });
      expect(collector).toBeDefined();
    });

    it('should fallback when isReady is not provided', () => {
      const fetchOutput = { testPass: 100 };
      // @ts-expect-error not providing isReady to test the logic fallback
      const collector = new Collector(logger, {
        type: 'my_test_collector',
        fetch: () => fetchOutput,
      });
      expect(collector.isReady()).toBe(true);
    });
  });

  describe('formatForBulkUpload', () => {
    it('should use the default formatter', () => {
      const fetchOutput = { testPass: 100 };
      const collector = new Collector(logger, {
        type: 'my_test_collector',
        isReady: () => false,
        fetch: () => fetchOutput,
      });
      expect(collector.formatForBulkUpload(fetchOutput)).toStrictEqual({
        type: 'my_test_collector',
        payload: fetchOutput,
      });
    });

    it('should use a custom formatter', () => {
      const fetchOutput = { testPass: 100 };
      const collector = new Collector(logger, {
        type: 'my_test_collector',
        isReady: () => false,
        fetch: () => fetchOutput,
        formatForBulkUpload: (a) => ({ type: 'other_value', payload: { nested: a } }),
      });
      expect(collector.formatForBulkUpload(fetchOutput)).toStrictEqual({
        type: 'other_value',
        payload: { nested: fetchOutput },
      });
    });

    it("should use UsageCollector's default formatter", () => {
      const fetchOutput = { testPass: 100 };
      const collector = new UsageCollector(logger, {
        type: 'my_test_collector',
        isReady: () => false,
        fetch: () => fetchOutput,
      });
      expect(collector.formatForBulkUpload(fetchOutput)).toStrictEqual({
        type: 'kibana_stats',
        payload: { usage: { my_test_collector: fetchOutput } },
      });
    });
  });

  describe('schema TS validations', () => {
    // These tests below are used to ensure types inference is working as expected.
    // We don't intend to test any logic as such, just the relation between the types in `fetch` and `schema`.
    // Using ts-expect-error when an error is expected will fail the compilation if there is not such error.

    test('when fetch returns a simple object', () => {
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

    test('when fetch returns array-properties and schema', () => {
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

    test('TS should complain when schema is missing some properties', () => {
      const collector = new Collector(logger, {
        type: 'my_test_collector',
        isReady: () => false,
        fetch: () => ({ testPass: [{ name: 'a', value: 100 }], otherProp: 1 }),
        // @ts-expect-error
        schema: {
          testPass: { name: { type: 'keyword' }, value: { type: 'long' } },
        },
      });
      expect(collector).toBeDefined();
    });

    test('TS complains if schema misses any of the optional properties', () => {
      const collector = new Collector(logger, {
        type: 'my_test_collector',
        isReady: () => false,
        // Need to be explicit with the returned type because TS struggles to identify it
        fetch: (): { testPass?: Array<{ name: string; value: number }>; otherProp?: number } => {
          if (Math.random() > 0.5) {
            return { testPass: [{ name: 'a', value: 100 }] };
          }
          return { otherProp: 1 };
        },
        // @ts-expect-error
        schema: {
          testPass: { name: { type: 'keyword' }, value: { type: 'long' } },
        },
      });
      expect(collector).toBeDefined();
    });

    test('schema defines all the optional properties', () => {
      const collector = new Collector(logger, {
        type: 'my_test_collector',
        isReady: () => false,
        // Need to be explicit with the returned type because TS struggles to identify it
        fetch: (): { testPass?: Array<{ name: string; value: number }>; otherProp?: number } => {
          if (Math.random() > 0.5) {
            return { testPass: [{ name: 'a', value: 100 }] };
          }
          return { otherProp: 1 };
        },
        schema: {
          testPass: { name: { type: 'keyword' }, value: { type: 'long' } },
          otherProp: { type: 'long' },
        },
      });
      expect(collector).toBeDefined();
    });
  });
});
