/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
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
          testPass: {
            type: 'array',
            items: { name: { type: 'keyword' }, value: { type: 'long' } },
          },
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
          testPass: {
            type: 'array',
            items: { name: { type: 'keyword' }, value: { type: 'long' } },
          },
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
          testPass: {
            type: 'array',
            items: { name: { type: 'keyword' }, value: { type: 'long' } },
          },
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
          testPass: {
            type: 'array',
            items: { name: { type: 'keyword' }, value: { type: 'long' } },
          },
          otherProp: { type: 'long' },
        },
      });
      expect(collector).toBeDefined();
    });

    test('TS allows _meta.descriptions in schema', () => {
      const collector = new Collector(logger, {
        type: 'my_test_collector_with_description',
        isReady: () => false,
        fetch: () => ({ testPass: 100 }),
        schema: {
          testPass: { type: 'long' },
          _meta: { description: 'Count of testPass as number' },
        },
      });
      expect(collector).toBeDefined();
    });

    test('schema allows _meta as a data field', () => {
      const collector = new Collector(logger, {
        type: 'my_test_collector_with_meta_field',
        isReady: () => false,
        fetch: () => ({ testPass: 100, _meta: 'metaData' }),
        schema: {
          testPass: { type: 'long' },
          _meta: { type: 'keyword' },
        },
      });
      expect(collector).toBeDefined();
    });

    test('schema allows _meta as a data field that has a description', () => {
      const collector = new Collector(logger, {
        type: 'my_test_collector_with_meta_field',
        isReady: () => false,
        fetch: () => ({ testPass: 100, _meta: 'metaData' }),
        schema: {
          testPass: { type: 'long' },
          _meta: { type: 'keyword', _meta: { description: '_meta data as a keyword' } },
        },
      });
      expect(collector).toBeDefined();
    });
  });
});
