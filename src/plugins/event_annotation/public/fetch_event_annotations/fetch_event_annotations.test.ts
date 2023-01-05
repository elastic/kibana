/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, IUiSettingsClient } from '@kbn/core/public';

import {
  AggsStart,
  DataViewsContract,
  ExpressionValueSearchContext,
} from '@kbn/data-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { EventAnnotationService } from '..';
import { getFetchEventAnnotations } from '.';
import { FetchEventAnnotationsArgs, QueryPointEventAnnotationOutput } from '../../common';
import { EventAnnotationStartDependencies } from '../plugin';
import { of as mockOf } from 'rxjs';
import { handleRequest } from '../../common/fetch_event_annotations/handle_request';
jest.mock('../../common/fetch_event_annotations/handle_request', () => {
  const original = jest.requireActual('../../common/fetch_event_annotations/handle_request');
  return {
    ...original,
    handleRequest: jest.fn(() =>
      mockOf({
        type: 'datatable',
        columns: [
          {
            id: 'col-0-annotations',
            name: 'filters',
            meta: {
              type: 'number',
            },
          },
          {
            id: 'col-1-1',
            name: 'order_date per day',
            meta: {
              type: 'date',
            },
          },
          {
            id: 'col-2-2',
            name: 'Count',
            meta: {
              type: 'number',
            },
          },
          {
            id: 'col-3-3',
            name: 'First 10 order_date',
            meta: {
              type: 'date',
            },
          },
          {
            id: 'col-4-4',
            name: 'First 10 category.keyword',
            meta: {
              type: 'string',
            },
          },
        ],
        rows: [
          {
            'col-0-1': 'ann1',
            'col-1-2': 1657922400000,
            'col-2-3': 1,
            'col-3-4': '2022-07-16T15:27:22.000Z',
            'col-4-5': "Women's Clothing",
          },
        ],
      })
    ),
  };
});

const dataView1 = {
  type: 'index_pattern',
  value: {
    id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    name: 'Kibana Sample Data eCommerce',
  },
};

const dataView2 = {
  type: 'index_pattern',
  value: {
    id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    name: 'Kibana Sample Data Logs',
  },
};

const dataMock = dataPluginMock.createStartContract();

const mockHandlers = {
  abortSignal: jest.fn() as unknown as jest.Mocked<AbortSignal>,
  getSearchContext: jest.fn(),
  getSearchSessionId: jest.fn().mockReturnValue('abc123'),
  getExecutionContext: jest.fn(),
  inspectorAdapters: jest.fn(),
  variables: {},
  types: {},
};

const startServices = [
  { uiSettings: { get: jest.fn(() => {}) } as unknown as IUiSettingsClient },
  {
    data: {
      ...dataMock,
      search: {
        ...dataMock.search,
        aggs: {
          createAggConfigs: jest.fn((_, arg) => arg),
        } as unknown as AggsStart,
      },
      dataViews: {
        ...dataMock.dataViews,
        create: jest.fn().mockResolvedValue({}),
      } as DataViewsContract,
    },
  },
  {},
] as [CoreStart, EventAnnotationStartDependencies, EventAnnotationService];

const getStartServices = async () => startServices;

const manualAnnotationSamples = {
  point1: {
    id: 'mann1',
    type: 'manual_point_event_annotation',
    time: '2022-07-05T11:12:00Z',
  },
  point2: {
    id: 'mann2',
    type: 'manual_point_event_annotation',
    time: '2022-07-05T01:18:00Z',
  },
  range: {
    id: 'mann3',
    type: 'manual_range_event_annotation',
    time: '2022-07-03T05:00:00Z',
    endTime: '2022-07-05T00:01:00Z',
  },
  customPoint: {
    id: 'mann4',
    type: 'manual_point_event_annotation',
    time: '2022-07-05T04:34:00Z',
    label: 'custom',
    color: '#9170b8',
    lineWidth: 3,
    lineStyle: 'dotted',
    icon: 'triangle',
    textVisibility: true,
  },
  hiddenPoint: {
    id: 'mann5',
    type: 'manual_point_event_annotation',
    time: '2022-07-05T05:55:00Z',
    isHidden: true,
  },
  tooLatePoint: {
    id: 'mann6',
    type: 'manual_point_event_annotation',
    time: '2022-08-05T12:48:10Z',
  },
  tooOldPoint: {
    id: 'mann7',
    type: 'manual_point_event_annotation',
    time: '2022-06-05T12:48:10Z',
  },
  tooOldRange: {
    id: 'mann8',
    type: 'manual_range_event_annotation',
    time: '2022-06-03T05:00:00Z',
    endTime: '2022-06-05T00:01:00Z',
  },
  toLateRange: {
    id: 'mann9',
    type: 'manual_range_event_annotation',
    time: '2022-08-03T05:00:00Z',
    endTime: '2022-08-05T00:01:00Z',
  },
  customRange: {
    id: 'mann10',
    type: 'manual_range_event_annotation',
    time: '2022-06-03T05:00:00Z',
    endTime: '2022-08-05T00:01:00Z',
    label: 'Event range',
    color: '#F04E981A',
    outside: false,
  },
};

const queryAnnotationSamples: Record<string, QueryPointEventAnnotationOutput> = {
  noExtraFields: {
    type: 'query_point_event_annotation',
    id: 'ann1',
    filter: {
      type: 'kibana_query',
      language: 'kuery',
      query: 'products.base_price < 7',
    },
    timeField: 'order_date',
    label: 'Ann1',
  },
  extraFields: {
    type: 'query_point_event_annotation',
    id: 'ann2',
    label: 'Ann2',
    filter: {
      type: 'kibana_query',
      language: 'kuery',
      query: 'products.base_price > 700',
    },
    extraFields: ['price', 'currency', 'total_quantity'],
    timeField: 'order_date',
    color: '#9170b8',
    lineWidth: 3,
    lineStyle: 'dotted',
    icon: 'triangle',
    textVisibility: true,
  },
  hidden: {
    type: 'query_point_event_annotation',
    id: 'ann3',
    label: 'Ann3',
    timeField: 'timestamp',
    filter: {
      type: 'kibana_query',
      language: 'kuery',
      query: 'category = "accessories"',
    },
    extraFields: [],
    isHidden: true,
  },
  differentTimeField: {
    type: 'query_point_event_annotation',
    filter: {
      type: 'kibana_query',
      language: 'kuery',
      query: 'AvgTicketPrice > 900',
    },
    extraFields: ['extraField'],
    timeField: 'timestamp',
    id: 'ann4',
    label: 'Ann4',
  },
  ann5: {
    type: 'query_point_event_annotation',
    filter: {
      type: 'kibana_query',
      language: 'kuery',
      query: 'AvgTicketPrice = 800',
    },
    extraFields: [],
    timeField: 'timestamp',
    id: 'ann5',
    label: 'Ann5',
  },
};

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

const runGetFetchEventAnnotations = async (args: FetchEventAnnotationsArgs) => {
  return await getFetchEventAnnotations({ getStartServices })
    .fn(input, args, mockHandlers)
    .toPromise();
};

describe('getFetchEventAnnotations', () => {
  afterEach(() => {
    (startServices[1].data.dataViews.create as jest.Mock).mockClear();
    (handleRequest as jest.Mock).mockClear();
  });
  test('Returns empty datatable for empty groups', async () => {
    const result = await runGetFetchEventAnnotations({
      interval: '2h',
      groups: [],
    });
    expect(result).toEqual({ columns: [], rows: [], type: 'datatable' });
  });

  describe('Manual annotations', () => {
    const manualOnlyArgs = {
      interval: '30m',
      groups: [
        {
          type: 'event_annotation_group',
          dataView: dataView1,
          annotations: [
            manualAnnotationSamples.point1,
            manualAnnotationSamples.point2,
            manualAnnotationSamples.range,
          ],
        },
        {
          type: 'event_annotation_group',
          dataView: dataView1,
          annotations: [
            manualAnnotationSamples.customPoint,
            manualAnnotationSamples.hiddenPoint,
            manualAnnotationSamples.tooLatePoint,
            manualAnnotationSamples.tooOldPoint,
            manualAnnotationSamples.tooOldRange,
            manualAnnotationSamples.toLateRange,
            manualAnnotationSamples.customRange,
          ],
        },
      ],
    } as unknown as FetchEventAnnotationsArgs;

    test('Sorts annotations by time, assigns correct timebuckets, filters out hidden and out of range annotations', async () => {
      const result = await runGetFetchEventAnnotations(manualOnlyArgs);
      expect(result!.rows).toMatchSnapshot();
    });
  });

  describe('Query annotations', () => {
    test('runs handleRequest only for query annotations when manual and query are defined', async () => {
      const sampleArgs = {
        interval: '3d',
        groups: [
          {
            type: 'event_annotation_group',
            annotations: [manualAnnotationSamples.point1],
            dataView: dataView1,
          },
          {
            type: 'event_annotation_group',
            annotations: [
              manualAnnotationSamples.customPoint,
              queryAnnotationSamples.noExtraFields,
              queryAnnotationSamples.extraFields,
            ],
            dataView: dataView1,
          },
          {
            type: 'event_annotation_group',
            annotations: [
              queryAnnotationSamples.differentTimeField,
              queryAnnotationSamples.ann5,
              manualAnnotationSamples.range,
            ],
            dataView: dataView2,
          },
        ],
      } as unknown as FetchEventAnnotationsArgs;
      await runGetFetchEventAnnotations(sampleArgs);
      expect(startServices[1].data.dataViews.create).toBeCalledTimes(2);
      expect(handleRequest).toBeCalledTimes(2);
      expect((handleRequest as jest.Mock).mock.calls[0][0]!.aggs).toMatchSnapshot();
      expect((handleRequest as jest.Mock).mock.calls[1][0]!.aggs).toMatchSnapshot();
    });
    test('runs single handleRequest for query annotations with the same data view and timeField and creates aggregation for each extraField', async () => {
      const sampleArgs = {
        interval: '3d',
        groups: [
          {
            type: 'event_annotation_group',
            annotations: [queryAnnotationSamples.extraFields],
            dataView: dataView1,
          },
          {
            type: 'event_annotation_group',
            annotations: [queryAnnotationSamples.noExtraFields],
            dataView: dataView1,
          },
        ],
      } as unknown as FetchEventAnnotationsArgs;
      await runGetFetchEventAnnotations(sampleArgs);
      expect(startServices[1].data.dataViews.create).toBeCalledTimes(1);
      expect(handleRequest).toBeCalledTimes(1);
      expect((handleRequest as jest.Mock).mock.calls[0][0]!.aggs).toMatchSnapshot();
    });
    test('runs two separate handleRequests if timeField is different', async () => {
      const sampleArgs = {
        interval: '3d',
        groups: [
          {
            type: 'event_annotation_group',
            annotations: [queryAnnotationSamples.noExtraFields],
            dataView: dataView1,
          },
          {
            type: 'event_annotation_group',
            annotations: [queryAnnotationSamples.differentTimeField],
            dataView: dataView1,
          },
        ],
      } as unknown as FetchEventAnnotationsArgs;
      await runGetFetchEventAnnotations(sampleArgs);
      expect(startServices[1].data.dataViews.create).toBeCalledTimes(1);
      expect(handleRequest).toBeCalledTimes(2); // how many times and with what params
      expect((handleRequest as jest.Mock).mock.calls[0][0]!.aggs).toMatchSnapshot();
      expect((handleRequest as jest.Mock).mock.calls[1][0]!.aggs).toMatchSnapshot();
    });
  });
});
