/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { LegendActionProps, SeriesIdentifier } from '@elastic/charts';
import { EuiPopover } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ComponentType, ReactWrapper } from 'enzyme';
import type { DataLayerConfigResult, LensMultiTable } from '../../common';
import { LayerTypes } from '../../common/constants';
import { getLegendAction } from './legend_action';
import { LegendActionPopover } from './legend_action_popover';
import { mockPaletteOutput } from '../../common/__mocks__';

const tables = {
  first: {
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
  },
} as LensMultiTable['tables'];

const sampleLayer: DataLayerConfigResult = {
  type: 'dataLayer',
  layerType: LayerTypes.DATA,
  seriesType: 'line',
  xAccessor: 'c',
  accessors: ['a', 'b'],
  splitAccessor: 'splitAccessorId',
  columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
  xScaleType: 'ordinal',
  yScaleType: 'linear',
  isHistogram: false,
  palette: mockPaletteOutput,
  table: tables.first,
};

describe('getLegendAction', function () {
  let wrapperProps: LegendActionProps;
  const Component: ComponentType<LegendActionProps> = getLegendAction(
    [sampleLayer],
    jest.fn(),
    jest.fn(),
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
        },
      ] as unknown as SeriesIdentifier[],
    };
    wrapper = mountWithIntl(<Component {...newProps} />);
    expect(wrapper.find(EuiPopover).length).toBe(1);
    expect(wrapper.find(EuiPopover).prop('title')).toEqual("Women's Accessories, filter options");
    expect(wrapper.find(LegendActionPopover).prop('context')).toEqual({
      data: [
        {
          column: 1,
          row: 1,
          table: tables.first,
          value: "Women's Accessories",
        },
      ],
    });
  });
});
