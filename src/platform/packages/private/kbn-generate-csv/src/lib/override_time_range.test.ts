/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { overrideTimeRange } from './override_time_range';

describe('overrideTimeRange', () => {
  it('should modify the time range in the filter', () => {
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

    overrideTimeRange(filter, '2025-06-18T19:55:00.000Z');
    expect(filter).toEqual({
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
    });
  });

  it('should modify the time range in the filter array', () => {
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

    overrideTimeRange(filter, '2025-06-18T19:55:00.000Z');
    expect(filter).toEqual([
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

  it('should modify the time range in the filter array when timestamp field is not @timestamp', () => {
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

    overrideTimeRange(filter, '2025-06-18T19:55:00.000Z');
    expect(filter).toEqual([
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

  it('should not modify filter if not time field', () => {
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

    overrideTimeRange(filter, '2025-06-18T19:55:00.000Z');
    expect(filter).toEqual([
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
    ]);
  });

  it('should not modify filter if no meta', () => {
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

    // @ts-expect-error missing meta field
    overrideTimeRange(filter, '2025-06-18T19:55:00.000Z');
    expect(filter).toEqual([
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
    ]);
  });

  it('should not modify filter if not timestamps', () => {
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
              gte: 3,
              lte: 10,
            },
          },
        },
      },
    ];

    overrideTimeRange(filter, '2025-06-18T19:55:00.000Z');
    expect(filter).toEqual([
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
              gte: '3',
              lte: '10',
            },
          },
        },
      },
    ]);
  });
});
