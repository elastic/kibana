/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getSplits } from './get_splits';

describe('getSplits(resp, panel, series)', () => {
  test('should return a splits for everything/filter group bys', async () => {
    const resp = {
      aggregations: {
        SERIES: {
          timeseries: { buckets: [] },
          SIBAGG: { value: 1 },
          meta: { bucketSize: 10 },
        },
      },
    };
    const panel = { type: 'timeseries' };
    const series = {
      id: 'SERIES',
      color: 'rgb(255, 0, 0)',
      split_mode: 'everything',
      metrics: [
        { id: 'AVG', type: 'avg', field: 'cpu' },
        { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' },
      ],
    };
    expect(await getSplits(resp, panel, series, undefined)).toEqual([
      {
        id: 'SERIES',
        label: 'Overall Average of Average of cpu',
        meta: { bucketSize: 10 },
        color: 'rgb(255, 0, 0)',
        splitByLabel: 'Overall Average of Average of cpu',
        timeseries: { buckets: [] },
        SIBAGG: { value: 1 },
      },
    ]);
  });

  test('should return a splits for terms group bys for top_n', async () => {
    const resp = {
      aggregations: {
        SERIES: {
          buckets: [
            {
              key: 'example-01',
              timeseries: { buckets: [] },
              SIBAGG: { value: 1 },
            },
            {
              key: 'example-02',
              timeseries: { buckets: [] },
              SIBAGG: { value: 2 },
            },
          ],
          meta: { bucketSize: 10 },
        },
      },
    };
    const series = {
      id: 'SERIES',
      color: '#F00',
      split_mode: 'terms',
      terms_field: 'beat.hostname',
      terms_size: 10,
      metrics: [
        { id: 'AVG', type: 'avg', field: 'cpu' },
        { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' },
      ],
    };
    const panel = { type: 'top_n' };
    expect(await getSplits(resp, panel, series)).toEqual([
      {
        id: 'SERIES:example-01',
        key: 'example-01',
        label: 'example-01',
        labelFormatted: '',
        meta: { bucketSize: 10 },
        color: 'rgb(255, 0, 0)',
        splitByLabel: 'Overall Average of Average of cpu',
        timeseries: { buckets: [] },
        SIBAGG: { value: 1 },
      },
      {
        id: 'SERIES:example-02',
        key: 'example-02',
        label: 'example-02',
        labelFormatted: '',
        meta: { bucketSize: 10 },
        color: 'rgb(255, 0, 0)',
        splitByLabel: 'Overall Average of Average of cpu',
        timeseries: { buckets: [] },
        SIBAGG: { value: 2 },
      },
    ]);
  });

  test('should return a splits for terms group with label formatted by {{key}} placeholder', async () => {
    const resp = {
      aggregations: {
        SERIES: {
          buckets: [
            {
              key: 'example-01',
              timeseries: { buckets: [] },
              SIBAGG: { value: 1 },
            },
            {
              key: 'example-02',
              timeseries: { buckets: [] },
              SIBAGG: { value: 2 },
            },
          ],
          meta: { bucketSize: 10 },
        },
      },
    };
    const series = {
      id: 'SERIES',
      label: '--{{key}}--',
      color: '#F00',
      split_mode: 'terms',
      terms_field: 'beat.hostname',
      terms_size: 10,
      metrics: [
        { id: 'AVG', type: 'avg', field: 'cpu' },
        { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' },
      ],
    };
    const panel = { type: 'top_n' };
    expect(await getSplits(resp, panel, series)).toEqual([
      {
        id: 'SERIES:example-01',
        key: 'example-01',
        label: '--example-01--',
        labelFormatted: '',
        meta: { bucketSize: 10 },
        color: 'rgb(255, 0, 0)',
        splitByLabel: 'Overall Average of Average of cpu',
        timeseries: { buckets: [] },
        SIBAGG: { value: 1 },
      },
      {
        id: 'SERIES:example-02',
        key: 'example-02',
        label: '--example-02--',
        labelFormatted: '',
        meta: { bucketSize: 10 },
        color: 'rgb(255, 0, 0)',
        splitByLabel: 'Overall Average of Average of cpu',
        timeseries: { buckets: [] },
        SIBAGG: { value: 2 },
      },
    ]);
  });

  test('should return a splits for terms group with labelFormatted if {{key}} placeholder is applied and key_as_string exists', async () => {
    const resp = {
      aggregations: {
        SERIES: {
          buckets: [
            {
              key: 'example-01',
              key_as_string: 'false',
              timeseries: { buckets: [] },
              SIBAGG: { value: 1 },
            },
            {
              key: 'example-02',
              key_as_string: 'true',
              timeseries: { buckets: [] },
              SIBAGG: { value: 2 },
            },
          ],
          meta: { bucketSize: 10 },
        },
      },
    };
    const series = {
      id: 'SERIES',
      label: '--{{key}}--',
      color: '#F00',
      split_mode: 'terms',
      terms_field: 'beat.hostname',
      terms_size: 10,
      metrics: [
        { id: 'AVG', type: 'avg', field: 'cpu' },
        { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' },
      ],
    };
    const panel = { type: 'top_n' };

    expect(await getSplits(resp, panel, series)).toEqual([
      {
        id: 'SERIES:example-01',
        key: 'example-01',
        key_as_string: 'false',
        label: '--example-01--',
        labelFormatted: '--false--',
        meta: { bucketSize: 10 },
        color: 'rgb(255, 0, 0)',
        splitByLabel: 'Overall Average of Average of cpu',
        timeseries: { buckets: [] },
        SIBAGG: { value: 1 },
      },
      {
        id: 'SERIES:example-02',
        key: 'example-02',
        key_as_string: 'true',
        label: '--example-02--',
        labelFormatted: '--true--',
        meta: { bucketSize: 10 },
        color: 'rgb(255, 0, 0)',
        splitByLabel: 'Overall Average of Average of cpu',
        timeseries: { buckets: [] },
        SIBAGG: { value: 2 },
      },
    ]);
  });

  describe('terms group bys', () => {
    const resp = {
      aggregations: {
        SERIES: {
          buckets: [
            {
              key: 'example-01',
              timeseries: { buckets: [] },
              SIBAGG: { value: 1 },
            },
            {
              key: 'example-02',
              timeseries: { buckets: [] },
              SIBAGG: { value: 2 },
            },
          ],
          meta: { bucketSize: 10 },
        },
      },
    };

    test('should return a splits with no color', async () => {
      const series = {
        id: 'SERIES',
        color: '#F00',
        split_mode: 'terms',
        terms_field: 'beat.hostname',
        terms_size: 10,
        metrics: [
          { id: 'AVG', type: 'avg', field: 'cpu' },
          { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' },
        ],
      };
      const panel = { type: 'timeseries' };

      expect(await getSplits(resp, panel, series)).toEqual([
        {
          id: 'SERIES:example-01',
          key: 'example-01',
          label: 'example-01',
          labelFormatted: '',
          meta: { bucketSize: 10 },
          color: undefined,
          splitByLabel: 'Overall Average of Average of cpu',
          timeseries: { buckets: [] },
          SIBAGG: { value: 1 },
        },
        {
          id: 'SERIES:example-02',
          key: 'example-02',
          label: 'example-02',
          labelFormatted: '',
          meta: { bucketSize: 10 },
          color: undefined,
          splitByLabel: 'Overall Average of Average of cpu',
          timeseries: { buckets: [] },
          SIBAGG: { value: 2 },
        },
      ]);
    });

    test('should return gradient color', async () => {
      const series = {
        id: 'SERIES',
        color: '#F00',
        split_mode: 'terms',
        split_color_mode: 'gradient',
        terms_field: 'beat.hostname',
        terms_size: 10,
        metrics: [
          { id: 'AVG', type: 'avg', field: 'cpu' },
          { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' },
        ],
      };
      const panel = { type: 'timeseries' };

      expect(await getSplits(resp, panel, series)).toEqual([
        expect.objectContaining({
          color: 'rgb(255, 0, 0)',
        }),
        expect.objectContaining({
          color: 'rgb(147, 0, 0)',
        }),
      ]);
    });

    test('should return rainbow color', async () => {
      const series = {
        id: 'SERIES',
        color: '#F00',
        split_mode: 'terms',
        split_color_mode: 'rainbow',
        terms_field: 'beat.hostname',
        terms_size: 10,
        metrics: [
          { id: 'AVG', type: 'avg', field: 'cpu' },
          { id: 'SIBAGG', type: 'avg_bucket', field: 'AVG' },
        ],
      };
      const panel = { type: 'timeseries' };

      expect(await getSplits(resp, panel, series)).toEqual([
        expect.objectContaining({
          color: '#68BC00',
        }),
        expect.objectContaining({
          color: '#009CE0',
        }),
      ]);
    });
  });

  test('should return a splits for filters group bys', async () => {
    const resp = {
      aggregations: {
        SERIES: {
          buckets: {
            'filter-1': {
              timeseries: { buckets: [] },
            },
            'filter-2': {
              timeseries: { buckets: [] },
            },
          },
          meta: { bucketSize: 10 },
        },
      },
    };
    const series = {
      id: 'SERIES',
      color: 'rgb(255, 0, 0)',
      split_mode: 'filters',
      split_filters: [
        { id: 'filter-1', color: '#F00', filter: 'status_code:[* TO 200]', label: '200s' },
        { id: 'filter-2', color: '#0F0', filter: 'status_code:[300 TO *]', label: '300s' },
      ],
      metrics: [{ id: 'COUNT', type: 'count' }],
    };
    const panel = { type: 'timeseries' };

    expect(await getSplits(resp, panel, series)).toEqual([
      {
        id: 'SERIES:filter-1',
        key: 'filter-1',
        label: '200s',
        meta: { bucketSize: 10 },
        color: '#F00',
        timeseries: { buckets: [] },
      },
      {
        id: 'SERIES:filter-2',
        key: 'filter-2',
        label: '300s',
        meta: { bucketSize: 10 },
        color: '#0F0',
        timeseries: { buckets: [] },
      },
    ]);
  });
});
