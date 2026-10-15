/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilterStateStore } from '@kbn/es-query';
import { overrideTimeRange } from './override_time_range';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const mockLogger = loggingSystemMock.createLogger();

describe('overrideTimeRange', () => {
  it('should return modified time range filter', () => {
    const filter = {
      meta: {
        field: '@timestamp',
        index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
        params: {},
      },
      query: {
        range: {
          '@timestamp': {
            format: 'strict_date_optional_time',
            gte: '2025-01-01T19:38:24.286Z',
            lte: '2025-01-01T20:03:24.286Z',
          },
        },
      },
    };

    const updated = overrideTimeRange({
      currentFilters: filter,
      forceNow: '2025-06-18T19:55:00.000Z',
      logger: mockLogger,
    });
    expect(updated).toEqual([
      {
        meta: {
          field: '@timestamp',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          params: {},
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: '2025-06-18T19:30:00.000Z',
              lte: '2025-06-18T19:55:00.000Z',
            },
          },
        },
      },
    ]);
  });

  it('should return modified time range in filter array', () => {
    const filter = [
      {
        meta: {
          field: '@timestamp',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          params: {},
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: '2025-01-01T19:38:24.286Z',
              lte: '2025-01-01T20:03:24.286Z',
            },
          },
        },
      },
    ];

    const updated = overrideTimeRange({
      currentFilters: filter,
      forceNow: '2025-06-18T19:55:00.000Z',
      logger: mockLogger,
    });
    expect(updated).toEqual([
      {
        meta: {
          field: '@timestamp',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          params: {},
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: '2025-06-18T19:30:00.000Z',
              lte: '2025-06-18T19:55:00.000Z',
            },
          },
        },
      },
    ]);
  });

  it('should return modified time range in the filter array when timestamp field is not @timestamp', () => {
    const filter = [
      {
        meta: {
          field: 'event.start',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          params: {},
        },
        query: {
          range: {
            'event.start': {
              format: 'strict_date_optional_time',
              gte: '2025-01-01T19:38:24.286Z',
              lte: '2025-01-01T20:03:24.286Z',
            },
          },
        },
      },
    ];

    const updated = overrideTimeRange({
      currentFilters: filter,
      forceNow: '2025-06-18T19:55:00.000Z',
      logger: mockLogger,
    });
    expect(updated).toEqual([
      {
        meta: {
          field: 'event.start',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          params: {},
        },
        query: {
          range: {
            'event.start': {
              format: 'strict_date_optional_time',
              gte: '2025-06-18T19:30:00.000Z',
              lte: '2025-06-18T19:55:00.000Z',
            },
          },
        },
      },
    ]);
  });

  it('should maintain the same filter order', () => {
    const filter = [
      {
        $state: {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          field: 'event.action',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          key: 'event.action',
          negate: false,
          params: ['a', 'b', 'c'],
          type: 'phrases',
          value: ['a', 'b', 'c'],
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  'event.action': 'a',
                },
              },
              {
                match_phrase: {
                  'event.action': 'b',
                },
              },
              {
                match_phrase: {
                  'event.action': 'c',
                },
              },
            ],
          },
        },
      },
      {
        meta: {
          field: 'event.start',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          params: {},
        },
        query: {
          range: {
            'event.start': {
              format: 'strict_date_optional_time',
              gte: '2025-01-01T19:38:24.286Z',
              lte: '2025-01-01T20:03:24.286Z',
            },
          },
        },
      },
      {
        $state: {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          field: 'another.range.field',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          key: 'another.range.field',
          negate: false,
          params: {
            gte: '0',
            lt: '10',
          },
          type: 'range',
          value: {
            gte: '0',
            lt: '10',
          },
        },
        query: {
          range: {
            'another.range.field': {
              gte: '0',
              lt: '10',
            },
          },
        },
      },
    ];

    const updated = overrideTimeRange({
      // @ts-expect-error
      currentFilters: filter,
      forceNow: '2025-06-18T19:55:00.000Z',
      logger: mockLogger,
    });
    expect(updated).toEqual([
      {
        $state: {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          field: 'event.action',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          key: 'event.action',
          negate: false,
          params: ['a', 'b', 'c'],
          type: 'phrases',
          value: ['a', 'b', 'c'],
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  'event.action': 'a',
                },
              },
              {
                match_phrase: {
                  'event.action': 'b',
                },
              },
              {
                match_phrase: {
                  'event.action': 'c',
                },
              },
            ],
          },
        },
      },
      {
        meta: {
          field: 'event.start',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          params: {},
        },
        query: {
          range: {
            'event.start': {
              format: 'strict_date_optional_time',
              gte: '2025-06-18T19:30:00.000Z',
              lte: '2025-06-18T19:55:00.000Z',
            },
          },
        },
      },
      {
        $state: {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          field: 'another.range.field',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          key: 'another.range.field',
          negate: false,
          params: {
            gte: '0',
            lt: '10',
          },
          type: 'range',
          value: {
            gte: '0',
            lt: '10',
          },
        },
        query: {
          range: {
            'another.range.field': {
              gte: '0',
              lt: '10',
            },
          },
        },
      },
    ]);
  });

  it('should return modified time range in the filter array range filters are present', () => {
    const filter = [
      {
        meta: {
          field: 'event.start',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          params: {},
        },
        query: {
          range: {
            'event.start': {
              format: 'strict_date_optional_time',
              gte: '2025-01-01T19:38:24.286Z',
              lte: '2025-01-01T20:03:24.286Z',
            },
          },
        },
      },
      {
        $state: {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          field: 'event.action',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          key: 'event.action',
          negate: false,
          params: ['a', 'b', 'c'],
          type: 'phrases',
          value: ['a', 'b', 'c'],
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  'event.action': 'a',
                },
              },
              {
                match_phrase: {
                  'event.action': 'b',
                },
              },
              {
                match_phrase: {
                  'event.action': 'c',
                },
              },
            ],
          },
        },
      },
      {
        $state: {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          field: 'another.range.field',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          key: 'another.range.field',
          negate: false,
          params: {
            gte: '0',
            lt: '10',
          },
          type: 'range',
          value: {
            gte: '0',
            lt: '10',
          },
        },
        query: {
          range: {
            'another.range.field': {
              gte: '0',
              lt: '10',
            },
          },
        },
      },
    ];

    const updated = overrideTimeRange({
      // @ts-expect-error
      currentFilters: filter,
      forceNow: '2025-06-18T19:55:00.000Z',
      logger: mockLogger,
    });
    expect(updated).toEqual([
      {
        meta: {
          field: 'event.start',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          params: {},
        },
        query: {
          range: {
            'event.start': {
              format: 'strict_date_optional_time',
              gte: '2025-06-18T19:30:00.000Z',
              lte: '2025-06-18T19:55:00.000Z',
            },
          },
        },
      },
      {
        $state: {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          field: 'event.action',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          key: 'event.action',
          negate: false,
          params: ['a', 'b', 'c'],
          type: 'phrases',
          value: ['a', 'b', 'c'],
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  'event.action': 'a',
                },
              },
              {
                match_phrase: {
                  'event.action': 'b',
                },
              },
              {
                match_phrase: {
                  'event.action': 'c',
                },
              },
            ],
          },
        },
      },
      {
        $state: {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          field: 'another.range.field',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          key: 'another.range.field',
          negate: false,
          params: {
            gte: '0',
            lt: '10',
          },
          type: 'range',
          value: {
            gte: '0',
            lt: '10',
          },
        },
        query: {
          range: {
            'another.range.field': {
              gte: '0',
              lt: '10',
            },
          },
        },
      },
    ]);
  });

  it('should return undefined if unexpected time filter found', () => {
    const filter = [
      {
        meta: {
          field: 'event.start',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          params: {},
        },
        query: {
          range: {
            'another.field': {
              format: 'strict_date_optional_time',
              gte: '2025-01-01T19:38:24.286Z',
              lte: '2025-01-01T20:03:24.286Z',
            },
          },
        },
      },
    ];

    const updated = overrideTimeRange({
      currentFilters: filter,
      forceNow: '2025-06-18T19:55:00.000Z',
      logger: mockLogger,
    });
    expect(updated).toBeUndefined();
  });

  it('should return undefined if no meta field found', () => {
    const filter = [
      {
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: '2025-01-01T19:38:24.286Z',
              lte: '2025-01-01T20:03:24.286Z',
            },
          },
        },
      },
    ];

    const updated = overrideTimeRange({
      // @ts-expect-error missing meta field
      currentFilters: filter,
      forceNow: '2025-06-18T19:55:00.000Z',
    });
    expect(updated).toBeUndefined();
  });

  it('should use timeFieldName if no meta field found', () => {
    const filter = [
      {
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: '2025-01-01T19:38:24.286Z',
              lte: '2025-01-01T20:03:24.286Z',
            },
          },
        },
      },
    ];

    const updated = overrideTimeRange({
      // @ts-expect-error missing meta field
      currentFilters: filter,
      forceNow: '2025-06-18T19:55:00.000Z',
      timeFieldName: '@timestamp',
    });
    expect(updated).toEqual([
      {
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: '2025-06-18T19:30:00.000Z',
              lte: '2025-06-18T19:55:00.000Z',
            },
          },
        },
      },
    ]);
  });

  it('should return undefined if invalid time', () => {
    const filter = [
      {
        meta: {
          field: '@timestamp',
          index: '0bde9920-4ade-4c19-8043-368aa37f1dae',
          params: {},
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: 'foo',
              lte: 'bar',
            },
          },
        },
      },
    ];

    const updated = overrideTimeRange({
      currentFilters: filter,
      forceNow: '2025-06-18T19:55:00.000Z',
      logger: mockLogger,
    });
    expect(updated).toBeUndefined();
  });

  it('should return undefined for undefined filters', () => {
    const updated = overrideTimeRange({
      currentFilters: undefined,
      forceNow: '2025-06-18T19:55:00.000Z',
      logger: mockLogger,
    });
    expect(updated).toBeUndefined();
  });

  it('should return undefined for empty filters', () => {
    const updated = overrideTimeRange({
      currentFilters: [],
      forceNow: '2025-06-18T19:55:00.000Z',
      logger: mockLogger,
    });
    expect(updated).toBeUndefined();
  });

  describe('date math time range filters', () => {
    const forceNow = '2025-06-18T06:00:00.000Z';

    it('should resolve "now-24h" to "now" range anchored to forceNow', () => {
      const filter = {
        meta: {
          field: '@timestamp',
          index: 'test-index',
          params: {},
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: 'now-24h',
              lte: 'now',
            },
          },
        },
      };

      const updated = overrideTimeRange({
        currentFilters: filter,
        forceNow,
        logger: mockLogger,
      });

      expect(updated).toEqual([
        expect.objectContaining({
          query: {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2025-06-17T06:00:00.000Z',
                lte: '2025-06-18T06:00:00.000Z',
              },
            },
          },
        }),
      ]);
    });

    it('should resolve "now/d" rounded range anchored to forceNow (start/end of today)', () => {
      const filter = {
        meta: {
          field: '@timestamp',
          index: 'test-index',
          params: {},
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: 'now/d',
              lte: 'now/d',
            },
          },
        },
      };

      const updated = overrideTimeRange({
        currentFilters: filter,
        forceNow,
        logger: mockLogger,
      });

      // Both sides are resolved to ISO strings via dateMath with forceNow anchor.
      // The exact midnight depends on local timezone, so we verify they are valid ISO strings
      // and that lte >= gte (lte has roundUp=true so it's end-of-day).
      expect(updated).toHaveLength(1);
      const range = (updated![0] as any).query.range['@timestamp'];
      expect(range.format).toBe('strict_date_optional_time');
      expect(new Date(range.gte).getTime()).toBeGreaterThan(0);
      expect(new Date(range.lte).getTime()).toBeGreaterThan(0);
      expect(new Date(range.lte).getTime()).toBeGreaterThanOrEqual(new Date(range.gte).getTime());
      // lte should be close to end-of-day (within 1 second), gte close to start-of-day
      expect(new Date(range.lte).getTime() - new Date(range.gte).getTime()).toBeGreaterThan(
        23 * 60 * 60 * 1000
      );
    });

    it('should resolve "now-7d/d" to "now/d" range anchored to forceNow (last ~7 full days)', () => {
      const filter = {
        meta: {
          field: '@timestamp',
          index: 'test-index',
          params: {},
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: 'now-7d/d',
              lte: 'now/d',
            },
          },
        },
      };

      const updated = overrideTimeRange({
        currentFilters: filter,
        forceNow,
        logger: mockLogger,
      });

      expect(updated).toHaveLength(1);
      const range = (updated![0] as any).query.range['@timestamp'];
      expect(new Date(range.gte).getTime()).toBeGreaterThan(0);
      expect(new Date(range.lte).getTime()).toBeGreaterThan(0);
      // Span should be approximately 7 days (with rounding, between 6 and 8 days)
      const spanDays =
        (new Date(range.lte).getTime() - new Date(range.gte).getTime()) / (24 * 60 * 60 * 1000);
      expect(spanDays).toBeGreaterThan(6);
      expect(spanDays).toBeLessThan(8);
    });

    it('should handle date math range in a filter array', () => {
      const filters = [
        {
          meta: { field: '@timestamp', index: 'test-index', params: {} },
          query: {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: 'now-1h',
                lte: 'now',
              },
            },
          },
        },
        {
          $state: { store: FilterStateStore.APP_STATE },
          meta: { alias: null, disabled: false, negate: false },
          query: { match_phrase: { status: '200' } },
        },
      ];

      const updated = overrideTimeRange({
        currentFilters: filters,
        forceNow,
        logger: mockLogger,
      });

      expect(updated![0]).toEqual(
        expect.objectContaining({
          query: {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2025-06-18T05:00:00.000Z',
                lte: '2025-06-18T06:00:00.000Z',
              },
            },
          },
        })
      );
      // Other filters are preserved unchanged
      expect(updated![1]).toEqual(filters[1]);
    });
  });

  describe('timezone-aware date math rounding', () => {
    // 2025-06-18T06:00:00.000Z === 2025-06-18T02:00:00-04:00 in America/New_York (EDT).
    const forceNow = '2025-06-18T06:00:00.000Z';

    it('rounds "now/d" to the New York day boundary when timezone is provided', () => {
      const filter = {
        meta: {
          field: '@timestamp',
          index: 'test-index',
          params: {},
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: 'now/d',
              lte: 'now/d',
            },
          },
        },
      };

      const updated = overrideTimeRange({
        currentFilters: filter,
        forceNow,
        logger: mockLogger,
        timezone: 'America/New_York',
      });

      expect(updated).toEqual([
        expect.objectContaining({
          query: {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                // Start of 2025-06-18 in New York (EDT, UTC-4)
                gte: '2025-06-18T04:00:00.000Z',
                // End of 2025-06-18 in New York (EDT, UTC-4)
                lte: '2025-06-19T03:59:59.999Z',
              },
            },
          },
        }),
      ]);
    });

    it('rounds "now/d" to the UTC day boundary when no timezone is provided', () => {
      const filter = {
        meta: {
          field: '@timestamp',
          index: 'test-index',
          params: {},
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: 'now/d',
              lte: 'now/d',
            },
          },
        },
      };

      const updated = overrideTimeRange({
        currentFilters: filter,
        forceNow,
        logger: mockLogger,
      });

      expect(updated).toEqual([
        expect.objectContaining({
          query: {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2025-06-18T00:00:00.000Z',
                lte: '2025-06-18T23:59:59.999Z',
              },
            },
          },
        }),
      ]);
    });

    it('does not affect non-rounded date math regardless of timezone', () => {
      const filter = {
        meta: {
          field: '@timestamp',
          index: 'test-index',
          params: {},
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: 'now-24h',
              lte: 'now',
            },
          },
        },
      };

      const updated = overrideTimeRange({
        currentFilters: filter,
        forceNow,
        logger: mockLogger,
        timezone: 'America/New_York',
      });

      expect(updated).toEqual([
        expect.objectContaining({
          query: {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2025-06-17T06:00:00.000Z',
                lte: '2025-06-18T06:00:00.000Z',
              },
            },
          },
        }),
      ]);
    });
  });
});
