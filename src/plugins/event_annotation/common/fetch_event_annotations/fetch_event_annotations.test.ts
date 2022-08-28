/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueSearchContext } from '@kbn/data-plugin/common';
import { FetchEventAnnotationsArgs, fetchEventAnnotations } from '.';

const mockHandlers = {
  abortSignal: jest.fn() as unknown as jest.Mocked<AbortSignal>,
  getSearchContext: jest.fn(),
  getSearchSessionId: jest.fn().mockReturnValue('abc123'),
  getExecutionContext: jest.fn(),
  inspectorAdapters: jest.fn(),
  variables: {},
  types: {},
};

const args = {
  interval: '30m',
  group: [
    {
      type: 'event_annotation_group',
      annotations: [
        {
          type: 'manual_point_event_annotation',
          time: '2022-07-05T11:12:00Z',
        },
        {
          type: 'manual_point_event_annotation',
          time: '2022-07-05T01:18:00Z',
        },
        {
          type: 'manual_range_event_annotation',
          time: '2022-07-03T05:00:00Z',
          endTime: '2022-07-05T00:01:00Z',
        },
      ],
    },
    {
      type: 'event_annotation_group',
      annotations: [
        {
          type: 'manual_point_event_annotation',
          time: '2022-07-05T04:34:00Z',
          label: 'custom',
          color: '#9170b8',
          lineWidth: 3,
          lineStyle: 'dotted',
          icon: 'triangle',
          textVisibility: true,
        },
        {
          type: 'manual_point_event_annotation',
          time: '2022-07-05T05:55:00Z',
          isHidden: true,
        },
        {
          type: 'manual_point_event_annotation',
          time: '2022-08-05T12:48:10Z',
        },
        {
          type: 'manual_point_event_annotation',
          time: '2022-06-05T12:48:10Z',
        },
        {
          type: 'manual_range_event_annotation',
          time: '2022-06-03T05:00:00Z',
          endTime: '2022-06-05T00:01:00Z',
        },
        {
          type: 'manual_range_event_annotation',
          time: '2022-08-03T05:00:00Z',
          endTime: '2022-08-05T00:01:00Z',
        },
        {
          type: 'manual_range_event_annotation',
          time: '2022-06-03T05:00:00Z',
          endTime: '2022-08-05T00:01:00Z',
          label: 'Event range',
          color: '#F04E981A',
          outside: false,
        },
      ],
    },
  ],
} as FetchEventAnnotationsArgs;

const input = {
  type: 'kibana_context',
  query: [],
  filters: [],
  timeRange: {
    type: 'timerange',
    from: '2022-07-01T00:00:00Z',
    to: '2022-07-31T00:00:00Z',
  },
} as ExpressionValueSearchContext;

describe('fetchEventAnnotations', () => {
  test('Sorts annotations by time, assigns correct timebuckets, filters out hidden and out of range annotations', async () => {
    const result = await fetchEventAnnotations().fn(input, args, mockHandlers).toPromise();
    expect(result!.rows).toEqual([
      {
        type: 'range',
        time: '2022-06-03T05:00:00Z',
        endTime: '2022-08-05T00:01:00Z',
        label: 'Event range',
        color: '#F04E981A',
        outside: false,
        timebucket: '2022-06-03T05:00:00.000Z',
      },
      {
        type: 'range',
        time: '2022-07-03T05:00:00Z',
        endTime: '2022-07-05T00:01:00Z',
        timebucket: '2022-07-03T05:00:00.000Z',
      },
      {
        type: 'point',
        time: '2022-07-05T01:18:00Z',
        timebucket: '2022-07-05T01:00:00.000Z',
      },
      {
        type: 'point',
        time: '2022-07-05T04:34:00Z',
        label: 'custom',
        color: '#9170b8',
        lineWidth: 3,
        lineStyle: 'dotted',
        icon: 'triangle',
        textVisibility: true,
        timebucket: '2022-07-05T04:30:00.000Z',
      },
      {
        type: 'point',
        time: '2022-07-05T11:12:00Z',
        timebucket: '2022-07-05T11:00:00.000Z',
      },
    ]);
  });
});
