/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
});
