/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { LegendActionProps, SeriesIdentifier } from '@elastic/charts';
import { EuiPopover } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { ReactWrapper } from 'enzyme';
import type { DataLayerConfig } from '../../common';
import { LayerTypes } from '../../common/constants';
import { getLegendAction } from './legend_action';
import type { LegendCellValueActions } from './legend_action_popover';
import { LegendActionPopover } from './legend_action_popover';
import { mockPaletteOutput } from '../../common/test_utils';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { InvertedRawValueMap, LayerFieldFormats } from '../helpers';
import type { RawValue } from '@kbn/data-plugin/common';

const legendCellValueActions: LegendCellValueActions = [
  { id: 'action_1', displayName: 'Action 1', iconType: 'testIcon1', execute: () => {} },
  { id: 'action_2', displayName: 'Action 2', iconType: 'testIcon2', execute: () => {} },
];
const table: Datatable = {
  type: 'datatable',
  rows: [
    {
      xAccessorId: 1585758120000,
      splitAccessorId: "Men's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585758360000,
      splitAccessorId: "Women's Accessories",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585758360000,
      splitAccessorId: "Women's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585759380000,
      splitAccessorId: "Men's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585759380000,
      splitAccessorId: "Men's Shoes",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585759380000,
      splitAccessorId: "Women's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585760700000,
      splitAccessorId: "Men's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585760760000,
      splitAccessorId: "Men's Clothing",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585760760000,
      splitAccessorId: "Men's Shoes",
      yAccessorId: 1,
    },
    {
      xAccessorId: 1585761120000,
      splitAccessorId: "Men's Shoes",
      yAccessorId: 1,
    },
  ],
  columns: [
    {
      id: 'xAccessorId',
      name: 'order_date per minute',
      meta: {
        type: 'date',
        field: 'order_date',
        source: 'esaggs',
        index: 'indexPatternId',
        sourceParams: {
          indexPatternId: 'indexPatternId',
          type: 'date_histogram',
          params: {
            field: 'order_date',
            timeRange: { from: '2020-04-01T16:14:16.246Z', to: '2020-04-01T17:15:41.263Z' },
            useNormalizedEsInterval: true,
            scaleMetricValues: false,
            interval: '1m',
            drop_partials: false,
            min_doc_count: 0,
            extended_bounds: {},
          },
        },
        params: { id: 'date', params: { pattern: 'HH:mm' } },
      },
    },
    {
      id: 'splitAccessorId',
      name: 'Top values of category.keyword',
      meta: {
        type: 'string',
        field: 'category.keyword',
        source: 'esaggs',
        index: 'indexPatternId',
        sourceParams: {
          indexPatternId: 'indexPatternId',
          type: 'terms',
          params: {
            field: 'category.keyword',
            orderBy: 'yAccessorId',
            order: 'desc',
            size: 3,
            otherBucket: false,
            otherBucketLabel: 'Other',
            missingBucket: false,
            missingBucketLabel: 'Missing',
          },
        },
        params: {
          id: 'terms',
          params: {
            id: 'string',
            otherBucketLabel: 'Other',
            missingBucketLabel: 'Missing',
            parsedUrl: {
              origin: 'http://localhost:5601',
              pathname: '/jiy/app/kibana',
              basePath: '/jiy',
            },
          },
        },
      },
    },
    {
      id: 'yAccessorId',
      name: 'Count of records',
      meta: {
        type: 'number',
        source: 'esaggs',
        index: 'indexPatternId',
        sourceParams: {
          indexPatternId: 'indexPatternId',
          params: {},
        },
        params: { id: 'number' },
      },
    },
  ],
};

const sampleLayer: DataLayerConfig = {
  layerId: 'first',
  type: 'dataLayer',
  layerType: LayerTypes.DATA,
  seriesType: 'line',
  isStacked: false,
  isPercentage: false,
  isHorizontal: false,
  showLines: true,
  xAccessor: 'c',
  accessors: ['a', 'b'],
  splitAccessors: ['splitAccessorId'],
  columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
  xScaleType: 'ordinal',
  isHistogram: false,
  palette: mockPaletteOutput,
  table,
};

describe('getLegendAction', function () {
  let wrapperProps: LegendActionProps;
  const invertedRawValueMap: InvertedRawValueMap = new Map(
    table.columns.map((c) => [c.id, new Map<string, RawValue>()])
  );
  const Component: React.ComponentType<LegendActionProps> = getLegendAction(
    [sampleLayer],
    jest.fn(),
    [legendCellValueActions],
    {
      first: {
        splitSeriesAccessors: {
          splitAccessorId: {
            format: { id: 'string' },
            formatter: {
              convert(x: unknown) {
                return x;
              },
            } as FieldFormat,
          },
        },
      } as unknown as LayerFieldFormats,
    },
    {
      first: {
        table,
        invertedRawValueMap,
        formattedColumns: {},
      },
    },
    {}
  );
  let wrapper: ReactWrapper<LegendActionProps>;

  beforeAll(() => {
    wrapperProps = {
      color: 'rgb(109, 204, 177)',
      label: "Women's Accessories",
      series: [
        {
          seriesKeys: ["Women's Accessories", 'test'],
          splitAccessors: new Map().set('splitAccessorId', "Women's Accessories"),
        },
      ] as unknown as SeriesIdentifier[],
    };
  });

  it('is not rendered if not layer is detected', () => {
    wrapper = mountWithIntl(<Component {...wrapperProps} />);
    expect(wrapper).toEqual({});
    expect(wrapper.find(EuiPopover).length).toBe(0);
  });

  it('is rendered if row does not exist', () => {
    const newProps = {
      ...wrapperProps,
      series: [
        {
          seriesKeys: ['test', 'b'],
          splitAccessors: new Map().set('splitAccessorId', 'test'),
        },
      ] as unknown as SeriesIdentifier[],
    };
    wrapper = mountWithIntl(<Component {...newProps} />);
    expect(wrapper).toEqual({});
    expect(wrapper.find(EuiPopover).length).toBe(0);
  });

  it('is rendered if layer is detected', () => {
    const newProps = {
      ...wrapperProps,
      series: [
        {
          seriesKeys: ["Women's Accessories", 'b'],
          splitAccessors: new Map().set('splitAccessorId', "Women's Accessories"),
        },
      ] as unknown as SeriesIdentifier[],
    };
    wrapper = mountWithIntl(<Component {...newProps} />);
    expect(wrapper.find(EuiPopover).length).toBe(1);
    expect(wrapper.find(EuiPopover).prop('title')).toEqual(
      "Women's Accessories - Label B, filter options"
    );
    expect(wrapper.find(LegendActionPopover).prop('legendCellValueActions')).toEqual(
      legendCellValueActions.map((action) => ({ ...action, execute: expect.any(Function) }))
    );
  });

  it('is not rendered if column has isComputedColumn set to true', () => {
    const tableWithComputedColumn: Datatable = {
      ...table,
      columns: table.columns.map((col) =>
        col.id === 'splitAccessorId' ? { ...col, isComputedColumn: true } : col
      ),
    };
    const layerWithComputedColumn = { ...sampleLayer, table: tableWithComputedColumn };
    const ComponentWithComputedColumn = getLegendAction(
      [layerWithComputedColumn],
      jest.fn(),
      [legendCellValueActions],
      {
        first: {
          splitSeriesAccessors: {
            splitAccessorId: {
              format: { id: 'string' },
              formatter: {
                convert(x: unknown) {
                  return x;
                },
              } as FieldFormat,
            },
          },
        } as unknown as LayerFieldFormats,
      },
      {
        first: {
          table: tableWithComputedColumn,
          invertedRawValueMap,
          formattedColumns: {},
        },
      },
      {}
    );
    const newProps = {
      ...wrapperProps,
      series: [
        {
          seriesKeys: ["Women's Accessories", 'b'],
          splitAccessors: new Map().set('splitAccessorId', "Women's Accessories"),
        },
      ] as unknown as SeriesIdentifier[],
    };
    wrapper = mountWithIntl(<ComponentWithComputedColumn {...newProps} />);
    expect(wrapper).toEqual({});
    expect(wrapper.find(EuiPopover).length).toBe(0);
  });

  it('is rendered if column has isComputedColumn set to false', () => {
    const tableWithIndexField: Datatable = {
      ...table,
      columns: table.columns.map((col) =>
        col.id === 'splitAccessorId' ? { ...col, isComputedColumn: false } : col
      ),
    };
    const layerWithIndexField = { ...sampleLayer, table: tableWithIndexField };
    const ComponentWithIndexField = getLegendAction(
      [layerWithIndexField],
      jest.fn(),
      [legendCellValueActions],
      {
        first: {
          splitSeriesAccessors: {
            splitAccessorId: {
              format: { id: 'string' },
              formatter: {
                convert(x: unknown) {
                  return x;
                },
              } as FieldFormat,
            },
          },
        } as unknown as LayerFieldFormats,
      },
      {
        first: {
          table: tableWithIndexField,
          invertedRawValueMap,
          formattedColumns: {},
        },
      },
      {}
    );
    const newProps = {
      ...wrapperProps,
      series: [
        {
          seriesKeys: ["Women's Accessories", 'b'],
          splitAccessors: new Map().set('splitAccessorId', "Women's Accessories"),
        },
      ] as unknown as SeriesIdentifier[],
    };
    wrapper = mountWithIntl(<ComponentWithIndexField {...newProps} />);
    expect(wrapper.find(EuiPopover).length).toBe(1);
  });
});
