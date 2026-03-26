/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type Datatable } from '@kbn/expressions-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { eventAnnotationServiceMock } from '@kbn/event-annotation-plugin/public/mocks';

import { chartsActiveCursorService, chartsThemeService, paletteService } from '../test_utils';
import { createArgsWithLayers } from '../../common/test_utils';
import { XYChart, type XYChartRenderProps } from './xy_chart';
import type { LayerCellValueActions } from '../types';
import {
  setupResizeObserverMock,
  cleanResizeObserverMock,
  renderChart,
  setupCanvasMock,
  cleanCanvasMock,
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

describe('provides correct series naming', () => {
  beforeAll(() => {
    setupCanvasMock();
    setupResizeObserverMock();
    jest.useFakeTimers();
  });

  afterAll(() => {
    cleanCanvasMock();
    cleanResizeObserverMock();
    jest.useRealTimers();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    convertSpy.mockImplementation((d) => d);
    getFormatSpy.mockReturnValue({ convert: convertSpy });
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

  test('split series without formatting and single y accessor', async () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          xAccessor: 'c',
          accessors: ['a'],
          splitAccessors: ['d'],
          columnToLabel: '{"a": "Label A"}',
          xScaleType: XScaleTypes.ORDINAL,
          table: dataWithoutFormats,
        },
      ],
    };

    const { debugState } = await renderChart({ ...defaultProps, args: newArgs }, XYChart, true);

    expect(debugState?.lines).toHaveLength(2);
    expect(debugState?.lines?.[0]?.points).toHaveLength(1);
    expect(debugState?.lines?.[1]?.points).toHaveLength(1);
    expect(debugState?.lines?.[0]?.name).toBe('Row 1');
    expect(debugState?.lines?.[1]?.name).toBe('Row 2');
  });

  test('split series with formatting and single y accessor', async () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          xScaleType: XScaleTypes.ORDINAL,
          xAccessor: 'c',
          accessors: ['a'],
          splitAccessors: ['d'],
          columnToLabel: '{"a": "Label A"}',
          table: dataWithFormats,
        },
      ],
    };

    convertSpy.mockImplementation((d) =>
      d === 'Row 2' ? 'formatted Row 2' : d === 'I' ? 'formatted I' : d
    );

    const { debugState } = await renderChart({ ...defaultProps, args: newArgs }, XYChart, true);

    expect(debugState?.axes?.x[0].labels).toEqual(['formatted I', 'J']);
    expect(debugState?.lines).toHaveLength(2);
    expect(debugState?.lines?.[0]?.name).toBe('Row 1');
    expect(debugState?.lines?.[1]?.name).toBe('formatted Row 2');
    expect(debugState?.legend?.items[0]?.name).toBe('Row 1');
    expect(debugState?.legend?.items[1]?.name).toBe('formatted Row 2');
    expect(getFormatSpy).toHaveBeenCalledWith({ id: 'custom' });
  });

  test('split series without formatting with multiple y accessors', async () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          xScaleType: XScaleTypes.ORDINAL,
          accessors: ['a', 'b'],
          splitAccessors: ['d'],
          columnToLabel: '{"a": "Label A","b": "Label B"}',
          table: dataWithoutFormats,
        },
      ],
    };

    const { debugState } = await renderChart({ ...defaultProps, args: newArgs }, XYChart, true);

    expect(debugState?.lines).toHaveLength(4);
    expect(debugState?.lines?.[0]?.name).toBe('Row 1 - Label A');
    expect(debugState?.lines?.[1]?.name).toBe('Row 2 - Label A');
    expect(debugState?.lines?.[2]?.name).toBe('Row 1 - Label B');
    expect(debugState?.lines?.[3]?.name).toBe('Row 2 - Label B');
  });

  test('split series with formatting with multiple y accessors', async () => {
    const args = createArgsWithLayers();
    const newArgs = {
      ...args,
      layers: [
        {
          ...args.layers[0],
          xScaleType: XScaleTypes.ORDINAL,
          accessors: ['a', 'b'],
          splitAccessors: ['d'],
          columnToLabel: '{"a": "Label A","b": "Label B"}',
          table: dataWithFormats,
        },
      ],
    };
    convertSpy.mockImplementation((d) =>
      d === 'Row 1' ? 'formatted1' : d === 'Row 2' ? 'formatted2' : d
    );

    const { debugState } = await renderChart({ ...defaultProps, args: newArgs }, XYChart, true);

    expect(debugState?.lines).toHaveLength(4);
    expect(debugState?.lines?.[0]?.name).toBe('formatted1 - Label A');
    expect(debugState?.lines?.[1]?.name).toBe('formatted2 - Label A');
    expect(debugState?.lines?.[2]?.name).toBe('formatted1 - Label B');
    expect(debugState?.lines?.[3]?.name).toBe('formatted2 - Label B');
  });
});
