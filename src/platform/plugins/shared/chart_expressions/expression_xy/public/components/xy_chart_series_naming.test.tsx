/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';

import { LineSeries, SeriesNameFn } from '@elastic/charts';
import { type Datatable } from '@kbn/expressions-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { eventAnnotationServiceMock } from '@kbn/event-annotation-plugin/public/mocks';

import { chartsActiveCursorService, chartsThemeService, paletteService } from '../__mocks__';
import { createArgsWithLayers } from '../../common/__mocks__';
import { XYChart, type XYChartRenderProps } from './xy_chart';
import { XYProps } from '../../common/types';
import { DataLayers } from './data_layers';
import type { LayerCellValueActions } from '../types';
import {
  setupResizeObserverMock,
  cleanResizeObserverMock,
  renderChart,
} from '@kbn/chart-test-jest-helpers';
import { XScaleTypes } from '../../common/constants';

const onClickValue = jest.fn();
const onClickMultiValue = jest.fn();
const layerCellValueActions: LayerCellValueActions = [];
const onSelectRange = jest.fn();

const dataWithoutFormats: Datatable = {
  type: 'datatable',
  columns: [
    { id: 'a', name: 'a', meta: { type: 'number' } },
    { id: 'b', name: 'b', meta: { type: 'number' } },
    { id: 'c', name: 'c', meta: { type: 'string' } },
    { id: 'd', name: 'd', meta: { type: 'string' } },
  ],
  rows: [
    { a: 1, b: 2, c: 'I', d: 'Row 1' },
    { a: 1, b: 5, c: 'J', d: 'Row 2' },
  ],
};

const dataWithFormats: Datatable = {
  type: 'datatable',
  columns: [
    { id: 'a', name: 'a', meta: { type: 'number' } },
    { id: 'b', name: 'b', meta: { type: 'number' } },
    { id: 'c', name: 'c', meta: { type: 'string' } },
    { id: 'd', name: 'd', meta: { type: 'string', params: { id: 'custom' } } },
  ],
  rows: [
    { a: 1, b: 2, c: 'I', d: 'Row 1' },
    { a: 1, b: 5, c: 'J', d: 'Row 2' },
  ],
};
const getFormatSpy: jest.Mock = jest.fn();
const convertSpy: jest.Mock = jest.fn((x) => x);
getFormatSpy.mockReturnValue({ convert: convertSpy });

const defaultProps: Omit<XYChartRenderProps, 'args'> = {
  data: dataPluginMock.createStartContract(),
  formatFactory: getFormatSpy,
  timeZone: 'UTC',
  renderMode: 'view',
  chartsThemeService,
  chartsActiveCursorService,
  paletteService,
  minInterval: 50,
  onClickValue,
  onClickMultiValue,
  layerCellValueActions,
  onSelectRange,
  syncColors: false,
  syncTooltips: false,
  syncCursor: true,
  eventAnnotationService: eventAnnotationServiceMock,
  renderComplete: jest.fn(),
  timeFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
  setChartSize: jest.fn(),
  onCreateAlertRule: jest.fn(),
};
const getRenderedComponent = (args: XYProps) => {
  return shallow(<XYChart {...defaultProps} args={args} />);
};

describe('provides correct series naming', () => {
  const nameFnArgs = {
    seriesKeys: [],
    key: '',
    specId: 'a',
    xAccessor: '',
    yAccessor: '',
    splitAccessors: new Map(),
  };

  beforeAll(() => {
    setupResizeObserverMock();
    jest.useFakeTimers();
  });

  afterAll(() => {
    cleanResizeObserverMock();
    jest.useRealTimers();
  });

  test('simplest xy chart without human-readable name', async () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          xAccessor: 'c',
          accessors: ['a'],
          splitAccessors: [],
          columnToLabel: '',
          xScaleType: XScaleTypes.ORDINAL,
          table: dataWithoutFormats,
        },
      ],
    };

    const { debugState } = await renderChart({ ...defaultProps, args: newArgs }, XYChart, true);

    expect(debugState?.lines).toHaveLength(1);
    expect(debugState?.lines?.[0]?.name).toBe('a');
  });

  test('simplest xy chart with empty name', async () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          xAccessor: 'c',
          accessors: ['a'],
          splitAccessors: [],
          columnToLabel: '{"a":""}',
          xScaleType: XScaleTypes.ORDINAL,
          table: dataWithoutFormats,
        },
      ],
    };

    const { debugState } = await renderChart({ ...defaultProps, args: newArgs }, XYChart, true);

    expect(debugState?.lines).toHaveLength(1);
    expect(debugState?.lines?.[0]?.name).toBe('');
  });

  test('simplest xy chart with human-readable name', async () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          xAccessor: 'c',
          accessors: ['a'],
          splitAccessors: [],
          columnToLabel: '{"a":"Column A"}',
          xScaleType: XScaleTypes.ORDINAL,
          table: dataWithoutFormats,
        },
      ],
    };

    const { debugState } = await renderChart({ ...defaultProps, args: newArgs }, XYChart, true);

    expect(debugState?.lines).toHaveLength(1);
    expect(debugState?.lines?.[0]?.name).toBe('Column A');
  });

  test('multiple y accessors', async () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          xAccessor: 'c',
          accessors: ['a', 'b'],
          splitAccessors: [],
          columnToLabel: '{"a": "Label A"}',
          xScaleType: XScaleTypes.ORDINAL,
          table: dataWithoutFormats,
        },
      ],
    };

    const { debugState } = await renderChart({ ...defaultProps, args: newArgs }, XYChart, true);

    expect(debugState?.lines).toHaveLength(2);
    expect(debugState?.lines?.[0]?.name).toBe('Label A');
    expect(debugState?.lines?.[1]?.name).toBe('b');
  });

  test('split series without formatting and single y accessor', () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          accessors: ['a'],
          splitAccessors: ['d'],
          columnToLabel: '{"a": "Label A"}',
          table: dataWithoutFormats,
        },
      ],
    };

    const component = getRenderedComponent(newArgs);
    const nameFn = component.find(DataLayers).dive().find(LineSeries).prop('name') as SeriesNameFn;

    expect(
      nameFn(
        {
          ...nameFnArgs,
          seriesKeys: ['split1', 'a'],
          splitAccessors: nameFnArgs.splitAccessors.set('d', 'split1'),
        },
        false
      )
    ).toEqual('split1');
  });

  test('split series with formatting and single y accessor', () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          accessors: ['a'],
          splitAccessors: ['d'],
          columnToLabel: '{"a": "Label A"}',
          table: dataWithFormats,
        },
      ],
    };

    const component = getRenderedComponent(newArgs);
    const nameFn = component.find(DataLayers).dive().find(LineSeries).prop('name') as SeriesNameFn;

    convertSpy.mockReturnValueOnce('formatted');
    expect(
      nameFn(
        {
          ...nameFnArgs,
          seriesKeys: ['split1', 'a'],
          splitAccessors: nameFnArgs.splitAccessors.set('d', 'split1'),
        },
        false
      )
    ).toEqual('formatted');
    expect(getFormatSpy).toHaveBeenCalledWith({ id: 'custom' });
  });

  test('split series without formatting with multiple y accessors', () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          accessors: ['a', 'b'],
          splitAccessors: ['d'],
          columnToLabel: '{"a": "Label A","b": "Label B"}',
          table: dataWithoutFormats,
        },
      ],
    };

    const component = getRenderedComponent(newArgs);

    const lineSeries = component.find(DataLayers).dive().find(LineSeries);
    const nameFn1 = lineSeries.at(0).prop('name') as SeriesNameFn;
    const nameFn2 = lineSeries.at(0).prop('name') as SeriesNameFn;

    expect(
      nameFn1(
        {
          ...nameFnArgs,
          seriesKeys: ['split1', 'a'],
          splitAccessors: nameFnArgs.splitAccessors.set('d', 'split1'),
        },
        false
      )
    ).toEqual('split1 - Label A');
    expect(
      nameFn2(
        {
          ...nameFnArgs,
          seriesKeys: ['split1', 'b'],
          splitAccessors: nameFnArgs.splitAccessors.set('d', 'split1'),
        },
        false
      )
    ).toEqual('split1 - Label B');
  });

  test('split series with formatting with multiple y accessors', () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          accessors: ['a', 'b'],
          splitAccessors: ['d'],
          columnToLabel: '{"a": "Label A","b": "Label B"}',
          table: dataWithFormats,
        },
      ],
    };

    const component = getRenderedComponent(newArgs);

    const lineSeries = component.find(DataLayers).dive().find(LineSeries);
    const nameFn1 = lineSeries.at(0).prop('name') as SeriesNameFn;
    const nameFn2 = lineSeries.at(1).prop('name') as SeriesNameFn;

    convertSpy.mockReturnValueOnce('formatted1').mockReturnValueOnce('formatted2');
    expect(
      nameFn1(
        {
          ...nameFnArgs,
          seriesKeys: ['split1', 'a'],
          splitAccessors: nameFnArgs.splitAccessors.set('d', 'split1'),
        },
        false
      )
    ).toEqual('formatted1 - Label A');
    expect(
      nameFn2(
        {
          ...nameFnArgs,
          seriesKeys: ['split1', 'b'],
          splitAccessors: nameFnArgs.splitAccessors.set('d', 'split1'),
        },
        false
      )
    ).toEqual('formatted2 - Label B');
  });
});
