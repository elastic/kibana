/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type Datatable } from '@kbn/expressions-plugin/common';

import {
  setupResizeObserverMock,
  cleanResizeObserverMock,
  renderChart,
  setupCanvasMock,
  cleanCanvasMock,
} from '@kbn/chart-test-jest-helpers';
import { getFieldFormatsRegistry } from '@kbn/data-plugin/public/test_utils';
import { type CoreSetup } from '@kbn/core/public';

import type { HeatmapArguments, HeatmapRenderProps } from '../../common/types';
import { getAggsFormats } from '@kbn/data-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { LegendSize } from '@kbn/chart-expressions-common';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { createDatatableUtilitiesMock } from '@kbn/data-plugin/common/mocks';
import HeatmapComponent from './heatmap_component';
import { EMPTY_LABEL, MISSING_TOKEN } from '@kbn/field-formats-common';

// these are used within the DSL terms aggs custom format
const OTHER_BUCKET_LABEL = '[OTHER LABEL]';
const MISSING_BUCKET_LABEL = '[MISSING LABEL]';

const OTHER_TOKEN = '__other__';

const categoricalTable: Datatable = {
  type: 'datatable',
  columns: [
    { id: 'value', name: 'Count', meta: { type: 'number' } },
    {
      id: 'x',
      name: 'Category',
      meta: {
        type: 'string',
        params: {
          id: 'terms',
          params: {
            id: 'string',
            otherBucketLabel: OTHER_BUCKET_LABEL,
            missingBucketLabel: MISSING_BUCKET_LABEL,
          },
        },
      },
    },
    {
      id: 'y',
      name: 'Group',
      meta: {
        type: 'string',
        params: {
          id: 'terms',
          params: {
            id: 'string',
            otherBucketLabel: OTHER_BUCKET_LABEL,
            missingBucketLabel: MISSING_BUCKET_LABEL,
          },
        },
      },
    },
  ],
  rows: [],
};

const basicArgs: HeatmapArguments = {
  percentageMode: false,
  legend: {
    isVisible: true,
    position: 'top',
    type: 'heatmap_legend',
    legendSize: LegendSize.SMALL,
  },
  gridConfig: {
    isCellLabelVisible: true,
    isYAxisLabelVisible: true,
    isXAxisLabelVisible: true,
    isYAxisTitleVisible: true,
    isXAxisTitleVisible: true,
    type: 'heatmap_grid',
  },
  palette: {
    type: 'palette',
    name: '',
    params: {
      colors: ['rgb(0, 0, 0)', 'rgb(112, 38, 231)'],
      stops: [0, 150],
      gradient: false,
      rangeMin: 0,
      rangeMax: 150,
      range: 'number',
    },
  },
  showTooltip: true,
  highlightInHover: false,
  xAccessor: 'x',
  valueAccessor: 'value',
  yAccessor: 'y',
};

describe('XY categorical formatting', () => {
  // use the current fieldFormatRegistry
  const fieldFormatsRegistry = getFieldFormatsRegistry({
    uiSettings: { get: jest.fn() },
  } as unknown as CoreSetup);

  // attach the required aggsFormats to allow formatting special charts in esaggs
  fieldFormatsRegistry.register(
    getAggsFormats((serializedFieldFormat) =>
      fieldFormatsRegistry.deserialize(serializedFieldFormat)
    )
  );

  const formatFactory = (mapping?: SerializedFieldFormat) =>
    fieldFormatsRegistry.deserialize(mapping);

  const chartStartContract = chartPluginMock.createStartContract();
  const chartsThemeService = chartPluginMock.createSetupContract().theme;
  const chartsActiveCursorService = chartStartContract.activeCursor;
  const paletteService = chartPluginMock.createPaletteRegistry();
  const mockState = new Map();
  const uiState = {
    get: jest
      .fn()
      .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
    set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
    emit: jest.fn(),
    setSilent: jest.fn(),
  } as any;

  const defaultHeatmapProps: Omit<HeatmapRenderProps, 'args'> = {
    data: { type: 'datatable', columns: [], rows: [] },
    chartsThemeService,
    chartsActiveCursorService,
    uiState,
    onClickValue: jest.fn(),
    onSelectRange: jest.fn(),
    onClickMultiValue: jest.fn(),
    datatableUtilities: createDatatableUtilitiesMock(),
    paletteService,
    formatFactory,
    interactive: true,
    syncTooltips: false,
    syncCursor: true,
    renderComplete: jest.fn(),
  };

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

  test('Format empty string, other and missing tokens with  ordinal X axis', async () => {
    const { debugState } = await renderChart(
      {
        ...defaultHeatmapProps,
        data: {
          ...categoricalTable,
          rows: [
            { value: 1, x: 'ax', y: 'cy' },

            { value: 2, x: '', y: 'cy' },
            { value: 3, x: null, y: 'cy' },
            { value: 4, x: MISSING_TOKEN, y: 'cy' },
            { value: 5, x: OTHER_TOKEN, y: 'cy' },

            { value: 12, x: 'ax', y: '' },
            { value: 13, x: 'ax', y: null },
            { value: 14, x: 'ax', y: MISSING_TOKEN },
            { value: 15, x: 'ax', y: OTHER_TOKEN },
          ],
        },
        args: {
          ...basicArgs,
          xAccessor: 'x',
          valueAccessor: 'value',
          yAccessor: 'y',
        },
      },
      HeatmapComponent,
      true
    );
    // 4 categorical values, `null` skipped
    expect(debugState?.axes?.x[0].labels).toEqual([
      'ax',
      EMPTY_LABEL,
      MISSING_BUCKET_LABEL,
      OTHER_BUCKET_LABEL,
    ]);
    expect(debugState?.axes?.y[0].labels).toEqual([
      'cy',
      EMPTY_LABEL,
      MISSING_BUCKET_LABEL,
      OTHER_BUCKET_LABEL,
    ]);
    expect(debugState?.heatmap?.cells).toHaveLength(7);
  });

  test('empty chart with all null categories', async () => {
    const { debugState } = await renderChart(
      {
        ...defaultHeatmapProps,
        data: {
          ...categoricalTable,
          rows: [{ value: 10, x: null, y: null }],
        },
        args: {
          ...basicArgs,
          xAccessor: 'x',
          valueAccessor: 'value',
          yAccessor: 'y',
        },
      },
      HeatmapComponent,
      true
    );

    expect(debugState?.axes?.x[0].labels).toHaveLength(0);
    expect(debugState?.axes?.y[0].labels).toHaveLength(0);
    expect(debugState?.heatmap?.cells).toHaveLength(0);
  });
});
