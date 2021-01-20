/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { areJobsCompatible, mergeJobConfigurations } from './jobs_compatibility';

const jobs = [
  {
    job_id: 'foo1',
    rollup_index: 'foo_rollup',
    index_pattern: 'foo-*',
    fields: {
      node: [
        {
          agg: 'terms',
        },
      ],
      temperature: [
        {
          agg: 'min',
        },
        {
          agg: 'max',
        },
        {
          agg: 'sum',
        },
      ],
      timestamp: [
        {
          agg: 'date_histogram',
          time_zone: 'UTC',
          interval: '1h',
          delay: '7d',
        },
      ],
      voltage: [
        {
          agg: 'histogram',
          interval: 5,
        },
        {
          agg: 'sum',
        },
      ],
    },
  },
  {
    job_id: 'foo2',
    rollup_index: 'foo_rollup',
    index_pattern: 'foo-*',
    fields: {
      host: [
        {
          agg: 'terms',
        },
      ],
      timestamp: [
        {
          agg: 'date_histogram',
          time_zone: 'UTC',
          interval: '1h',
          delay: '7d',
        },
      ],
      voltage: [
        {
          agg: 'histogram',
          interval: 20,
        },
      ],
    },
  },
  {
    job_id: 'foo3',
    rollup_index: 'foo_rollup',
    index_pattern: 'foo-*',
    fields: {
      timestamp: [
        {
          agg: 'date_histogram',
          time_zone: 'PST',
          interval: '1h',
          delay: '7d',
        },
      ],
      voltage: [
        {
          agg: 'histogram',
          interval: 5,
        },
        {
          agg: 'sum',
        },
      ],
    },
  },
];

describe('areJobsCompatible', () => {
  it('should return false for invalid jobs arg', () => {
    expect(areJobsCompatible(123)).toEqual(false);
    expect(areJobsCompatible('foo')).toEqual(false);
  });

  it('should return true for no jobs or one job', () => {
    expect(areJobsCompatible()).toEqual(true);
    expect(areJobsCompatible([])).toEqual(true);
    expect(areJobsCompatible([jobs[1]])).toEqual(true);
  });

  it('should return true for 2 or more compatible jobs', () => {
    expect(areJobsCompatible([jobs[0], jobs[1]])).toEqual(true);
    expect(areJobsCompatible([jobs[1], jobs[0], jobs[1]])).toEqual(true);
  });

  it('should return false for 2 or more incompatible jobs', () => {
    expect(areJobsCompatible([jobs[1], jobs[2]])).toEqual(false);
    expect(areJobsCompatible([jobs[2], jobs[1], jobs[0]])).toEqual(false);
  });
});

describe('mergeJobConfigurations', () => {
  it('should throw an error for null/invalid jobs', () => {
    expect(() => mergeJobConfigurations()).toThrow();
    expect(() => mergeJobConfigurations(null)).toThrow();
    expect(() => mergeJobConfigurations(undefined)).toThrow();
    expect(() => mergeJobConfigurations(true)).toThrow();
    expect(() => mergeJobConfigurations('foo')).toThrow();
    expect(() => mergeJobConfigurations(123)).toThrow();
    expect(() => mergeJobConfigurations([])).toThrow();
  });

  it('should return aggregations for one job', () => {
    expect(mergeJobConfigurations([jobs[0]])).toEqual({
      aggs: {
        terms: {
          node: {
            agg: 'terms',
          },
        },
        min: {
          temperature: {
            agg: 'min',
          },
        },
        max: {
          temperature: {
            agg: 'max',
          },
        },
        sum: {
          temperature: {
            agg: 'sum',
          },
          voltage: {
            agg: 'sum',
          },
        },
        date_histogram: {
          timestamp: {
            agg: 'date_histogram',
            time_zone: 'UTC',
            interval: '1h',
            delay: '7d',
          },
        },
        histogram: {
          voltage: {
            agg: 'histogram',
            interval: 5,
          },
        },
      },
    });
  });

  it('should return merged aggregations for 2 jobs', () => {
    expect(mergeJobConfigurations([jobs[0], jobs[1]])).toEqual({
      aggs: {
        terms: {
          node: {
            agg: 'terms',
          },
          host: {
            agg: 'terms',
          },
        },
        min: {
          temperature: {
            agg: 'min',
          },
        },
        max: {
          temperature: {
            agg: 'max',
          },
        },
        sum: {
          temperature: {
            agg: 'sum',
          },
          voltage: {
            agg: 'sum',
          },
        },
        date_histogram: {
          timestamp: {
            agg: 'date_histogram',
            time_zone: 'UTC',
            interval: '1h',
            delay: '7d',
          },
        },
        histogram: {
          voltage: {
            agg: 'histogram',
            interval: 20,
          },
        },
      },
    });
  });

  it('should throw an error if jobs are not compatible', () => {
    expect(() => mergeJobConfigurations([jobs[0], jobs[1], jobs[2]])).toThrow();
  });
});
