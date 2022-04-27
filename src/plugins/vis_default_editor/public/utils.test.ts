/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { groupAndSortBy } from './utils';
import { AggGroupNames } from '@kbn/data-plugin/public';

const aggs = [
  {
    title: 'Count',
    type: AggGroupNames.Metrics,
    subtype: 'Metric Aggregations',
  },
  {
    title: 'Average',
    type: AggGroupNames.Metrics,
    subtype: 'Metric Aggregations',
  },
  {
    title: 'Cumulative Sum',
    type: AggGroupNames.Metrics,
    subtype: 'Parent Pipeline Aggregations',
  },
  {
    title: 'Min Bucket',
    type: AggGroupNames.Metrics,
    subtype: 'Parent Pipeline Aggregations',
  },
  {
    title: 'Sub string agg',
    type: 'string',
    subtype: 'Sub-String aggregations',
  },
  {
    title: 'String agg',
    type: 'string',
    subtype: 'String aggregations',
  },
];

describe('Default Editor groupAggregationsBy', () => {
  it('should return aggs grouped by type field', () => {
    const groupedAggs = [
      {
        label: AggGroupNames.Metrics,
        options: [
          {
            label: 'Average',
            target: {
              title: 'Average',
              type: AggGroupNames.Metrics,
              subtype: 'Metric Aggregations',
            },
          },
          {
            label: 'Count',
            target: {
              title: 'Count',
              type: AggGroupNames.Metrics,
              subtype: 'Metric Aggregations',
            },
          },
          {
            label: 'Cumulative Sum',
            target: {
              title: 'Cumulative Sum',
              type: AggGroupNames.Metrics,
              subtype: 'Parent Pipeline Aggregations',
            },
          },

          {
            label: 'Min Bucket',
            target: {
              title: 'Min Bucket',
              type: AggGroupNames.Metrics,
              subtype: 'Parent Pipeline Aggregations',
            },
          },
        ],
      },
      {
        label: 'string',
        options: [
          {
            label: 'String agg',
            target: {
              title: 'String agg',
              type: 'string',
              subtype: 'String aggregations',
            },
          },
          {
            label: 'Sub string agg',
            target: {
              title: 'Sub string agg',
              type: 'string',
              subtype: 'Sub-String aggregations',
            },
          },
        ],
      },
    ];
    expect(groupAndSortBy(aggs, 'type', 'title')).toEqual(groupedAggs);
  });
  it('should return aggs grouped by subtype field', () => {
    const groupedAggs = [
      {
        label: 'Metric Aggregations',
        options: [
          {
            label: 'Average',
            target: {
              title: 'Average',
              type: AggGroupNames.Metrics,
              subtype: 'Metric Aggregations',
            },
          },
          {
            label: 'Count',
            target: {
              title: 'Count',
              type: AggGroupNames.Metrics,
              subtype: 'Metric Aggregations',
            },
          },
        ],
      },
      {
        label: 'Parent Pipeline Aggregations',
        options: [
          {
            label: 'Cumulative Sum',
            target: {
              title: 'Cumulative Sum',
              type: AggGroupNames.Metrics,
              subtype: 'Parent Pipeline Aggregations',
            },
          },

          {
            label: 'Min Bucket',
            target: {
              title: 'Min Bucket',
              type: AggGroupNames.Metrics,
              subtype: 'Parent Pipeline Aggregations',
            },
          },
        ],
      },
      {
        label: 'String aggregations',
        options: [
          {
            label: 'String agg',
            target: {
              title: 'String agg',
              type: 'string',
              subtype: 'String aggregations',
            },
          },
        ],
      },
      {
        label: 'Sub-String aggregations',
        options: [
          {
            label: 'Sub string agg',
            target: {
              title: 'Sub string agg',
              type: 'string',
              subtype: 'Sub-String aggregations',
            },
          },
        ],
      },
    ];
    expect(groupAndSortBy(aggs, 'subtype', 'title')).toEqual(groupedAggs);
  });
});
