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
import {
  setupResizeObserverMock,
  cleanResizeObserverMock,
  renderChart,
  setupCanvasMock,
  cleanCanvasMock,
} from '@kbn/chart-test-jest-helpers';
import { EXTENDED_DATA_LAYER, LayerTypes, SeriesTypes, XScaleTypes } from '../../common/constants';
import { getFieldFormatsRegistry } from '@kbn/data-plugin/public/test_utils';
import { type CoreSetup } from '@kbn/core/public';

import type { ExtendedDataLayerConfig } from '../../common/types';
import { getAggsFormats } from '@kbn/data-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { EMPTY_LABEL, NULL_LABEL, MISSING_TOKEN } from '@kbn/field-formats-common';

// these are used within the DSL terms aggs custom format
const OTHER_BUCKET_LABEL = '[OTHER LABEL]';
const MISSING_BUCKET_LABEL = '[MISSING LABEL]';

const OTHER_TOKEN = '__other__';

const categoricalTable: Datatable = {
  type: 'datatable',
  columns: [
    { id: 'y', name: 'Count', meta: { type: 'number' } },
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
      id: 'g',
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
    {
      id: 'f',
      name: 'Sub-Group',
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

const basicLayer: ExtendedDataLayerConfig = {
  layerId: 'firstLayer',
  type: EXTENDED_DATA_LAYER,
  layerType: LayerTypes.DATA,
  palette: { type: 'palette', name: 'default' },
  isHistogram: false,
  isHorizontal: false,
  isPercentage: false,
  isStacked: false,
  seriesType: SeriesTypes.BAR,
  xAccessor: 'x',
  accessors: ['y'],
  splitAccessors: [],
  xScaleType: XScaleTypes.ORDINAL,
  table: categoricalTable,
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

  const defaultXYChartProps: Omit<XYChartRenderProps, 'args'> = {
    data: dataPluginMock.createStartContract(),
    formatFactory,
    timeZone: 'UTC',
    renderMode: 'view',
    chartsThemeService,
    chartsActiveCursorService,
    paletteService,
    minInterval: 50,
    onClickValue: jest.fn(),
    onClickMultiValue: jest.fn(),
    layerCellValueActions: [],
    onSelectRange: jest.fn(),
    syncColors: false,
    syncTooltips: false,
    syncCursor: true,
    eventAnnotationService: eventAnnotationServiceMock,
    renderComplete: jest.fn(),
    timeFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    setChartSize: jest.fn(),
    onCreateAlertRule: jest.fn(),
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
        ...defaultXYChartProps,
        args: createArgsWithLayers({
          ...basicLayer,
          table: {
            ...categoricalTable,
            rows: [
              { x: 'Group A', y: 1 },
              { x: '', y: 1 },
              { x: MISSING_TOKEN, y: 1 },
              { x: OTHER_TOKEN, y: 1 },
            ],
          },
        }),
        formatFactory,
      },
      XYChart,
      true
    );
    // 4 categorical values
    expect(debugState?.axes?.x[0]?.labels).toEqual([
      'Group A',
      EMPTY_LABEL,
      MISSING_BUCKET_LABEL,
      OTHER_BUCKET_LABEL,
    ]);
  });

  test('Format empty string, other and missing tokens with split series and ordinal X axis', async () => {
    const { debugState } = await renderChart(
      {
        ...defaultXYChartProps,
        args: createArgsWithLayers({
          ...basicLayer,
          splitAccessors: ['g'],
          isStacked: true,
          table: {
            ...categoricalTable,
            rows: [
              { x: 'A', y: 1, g: 'Group A' },
              { x: '', y: 1, g: 'Group A' },
              { x: MISSING_TOKEN, y: 1, g: 'Group A' },
              { x: OTHER_TOKEN, y: 1, g: 'Group A' },

              { x: 'A', y: 1, g: 'Group B' },
              { x: '', y: 1, g: 'Group B' },
              { x: MISSING_TOKEN, y: 1, g: 'Group B' },
              { x: OTHER_TOKEN, y: 1, g: 'Group B' },

              { x: 'A', y: 1, g: '' },
              { x: '', y: 1, g: '' },
              { x: MISSING_TOKEN, y: 1, g: '' },
              { x: OTHER_TOKEN, y: 1, g: '' },

              { x: 'A', y: 1, g: MISSING_TOKEN },
              { x: '', y: 1, g: MISSING_TOKEN },
              { x: MISSING_TOKEN, y: 1, g: MISSING_TOKEN },
              { x: OTHER_TOKEN, y: 1, g: MISSING_TOKEN },

              { x: 'A', y: 1, g: OTHER_TOKEN },
              { x: '', y: 1, g: OTHER_TOKEN },
              { x: MISSING_TOKEN, y: 1, g: OTHER_TOKEN },
              { x: OTHER_TOKEN, y: 1, g: OTHER_TOKEN },
            ],
          },
        }),
        formatFactory,
      },
      XYChart,
      true
    );
    // 4 categorical values
    expect(debugState?.axes?.x[0]?.labels).toEqual([
      'A',
      EMPTY_LABEL,
      MISSING_BUCKET_LABEL,
      OTHER_BUCKET_LABEL,
    ]);
    // 5 series
    expect(debugState?.bars?.map((b) => b.name)).toEqual([
      'Group A',
      'Group B',
      EMPTY_LABEL,
      MISSING_BUCKET_LABEL,
      OTHER_BUCKET_LABEL,
    ]);
  });

  test('Format empty string, other and missing tokens with multi-split series and ordinal X axis', async () => {
    const { debugState } = await renderChart(
      {
        ...defaultXYChartProps,
        args: createArgsWithLayers({
          ...basicLayer,
          splitAccessors: ['g', 'f'],
          isStacked: true,
          table: {
            ...categoricalTable,
            rows: [
              { x: 'A', y: 1, g: '', f: 'Sub A' },
              { x: '', y: 1, g: '', f: 'Sub A' },
              { x: MISSING_TOKEN, y: 1, g: '', f: 'Sub A' },
              { x: OTHER_TOKEN, y: 1, g: '', f: 'Sub A' },

              { x: 'A', y: 1, g: '', f: 'Sub B' },
              { x: '', y: 1, g: '', f: 'Sub B' },
              { x: MISSING_TOKEN, y: 1, g: '', f: 'Sub B' },
              { x: OTHER_TOKEN, y: 1, g: '', f: 'Sub B' },

              { x: 'A', y: 1, g: MISSING_TOKEN, f: 'Sub A' },
              { x: '', y: 1, g: MISSING_TOKEN, f: 'Sub A' },
              { x: MISSING_TOKEN, y: 1, g: MISSING_TOKEN, f: 'Sub A' },
              { x: OTHER_TOKEN, y: 1, g: MISSING_TOKEN, f: 'Sub A' },

              { x: 'A', y: 1, g: MISSING_TOKEN, f: 'Sub  B' },
              { x: '', y: 1, g: MISSING_TOKEN, f: 'Sub  B' },
              { x: MISSING_TOKEN, y: 1, g: MISSING_TOKEN, f: 'Sub  B' },
              { x: OTHER_TOKEN, y: 1, g: MISSING_TOKEN, f: 'Sub  B' },

              { x: 'A', y: 1, g: OTHER_TOKEN, f: 'Sub A' },
              { x: '', y: 1, g: OTHER_TOKEN, f: 'Sub A' },
              { x: MISSING_TOKEN, y: 1, g: OTHER_TOKEN, f: 'Sub A' },
              { x: OTHER_TOKEN, y: 1, g: OTHER_TOKEN, f: 'Sub A' },

              { x: 'A', y: 1, g: OTHER_TOKEN, f: 'Sub B' },
              { x: '', y: 1, g: OTHER_TOKEN, f: 'Sub B' },
              { x: MISSING_TOKEN, y: 1, g: OTHER_TOKEN, f: 'Sub B' },
              { x: OTHER_TOKEN, y: 1, g: OTHER_TOKEN, f: 'Sub B' },
            ],
          },
        }),
        formatFactory,
      },
      XYChart,
      true
    );
    // 4 categorical values
    expect(debugState?.axes?.x[0]?.labels).toEqual([
      'A',
      EMPTY_LABEL,
      MISSING_BUCKET_LABEL,
      OTHER_BUCKET_LABEL,
    ]);
    // 5 series
    expect(debugState?.bars?.map((b) => b.name)).toEqual([
      `${EMPTY_LABEL} › Sub A`,
      `${EMPTY_LABEL} › Sub B`,
      `${MISSING_BUCKET_LABEL} › Sub A`,
      `${MISSING_BUCKET_LABEL} › Sub  B`,
      `${OTHER_BUCKET_LABEL} › Sub A`,
      `${OTHER_BUCKET_LABEL} › Sub B`,
    ]);
  });

  test('Dont skip null in formatting categories in ordinal X axis', async () => {
    const { debugState } = await renderChart(
      {
        ...defaultXYChartProps,
        args: createArgsWithLayers({
          ...basicLayer,
          table: {
            ...categoricalTable,
            rows: [
              { x: 'Group A', y: 1 },
              { x: '', y: 1 },
              { x: null, y: 1 },
              { x: 'Group B', y: 1 },
            ],
          },
        }),
        formatFactory,
      },
      XYChart,
      true
    );
    expect(debugState?.axes?.x[0]?.labels).toEqual(['Group A', EMPTY_LABEL, NULL_LABEL, 'Group B']);
    // 1 series
    expect(debugState?.bars).toHaveLength(1);
    // 3 bars, null value skipped
    expect(debugState?.bars?.[0].bars).toHaveLength(4);
  });

  test('Dont skip null values with split series and ordinal X axis', async () => {
    const { debugState } = await renderChart(
      {
        ...defaultXYChartProps,
        args: createArgsWithLayers({
          ...basicLayer,
          splitAccessors: ['g'],
          isStacked: true,
          table: {
            ...categoricalTable,
            rows: [
              { x: 'A', y: 1, g: 'Group A' },
              { x: '', y: 1, g: 'Group A' },
              { x: null, y: 1, g: 'Group A' },
              { x: 'B', y: 1, g: 'Group A' },

              { x: 'A', y: 1, g: '' },
              { x: '', y: 1, g: '' },
              { x: null, y: 1, g: '' },
              { x: 'B', y: 1, g: '' },

              { x: 'A', y: 1, g: null },
              { x: '', y: 1, g: null },
              { x: null, y: 1, g: null },
              { x: 'B', y: 1, g: null },
            ],
          },
        }),
        formatFactory,
      },
      XYChart,
      true
    );
    // should be 4 categories including nulls
    expect(debugState?.axes?.x[0]?.labels).toEqual(['A', EMPTY_LABEL, NULL_LABEL, 'B']);
    // should be 3 series, null series are not skipped
    expect(debugState?.bars?.map((b) => b.name)).toEqual(['Group A', EMPTY_LABEL, NULL_LABEL]);
  });

  test('Skips null values with multi-split series and ordinal X axis', async () => {
    const { debugState } = await renderChart(
      {
        ...defaultXYChartProps,
        args: createArgsWithLayers({
          ...basicLayer,
          splitAccessors: ['g', 'f'],
          isStacked: true,
          table: {
            ...categoricalTable,
            rows: [
              { x: 'A', y: 1, g: 'Group A', f: 'Sub A' },
              { x: '', y: 1, g: 'Group A', f: 'Sub A' },
              { x: null, y: 1, g: 'Group A', f: 'Sub A' },
              { x: 'B', y: 1, g: 'Group A', f: 'Sub A' },

              { x: 'A', y: 1, g: 'Group A', f: 'Sub B' },
              { x: '', y: 1, g: 'Group A', f: 'Sub B' },
              { x: null, y: 1, g: 'Group A', f: 'Sub B' },
              { x: 'B', y: 1, g: 'Group A', f: 'Sub B' },

              { x: 'A', y: 1, g: '', f: 'Sub A' },
              { x: '', y: 1, g: '', f: 'Sub A' },
              { x: null, y: 1, g: '', f: 'Sub A' },
              { x: 'B', y: 1, g: '', f: 'Sub A' },

              { x: 'A', y: 1, g: '', f: 'Sub B' },
              { x: '', y: 1, g: '', f: 'Sub B' },
              { x: null, y: 1, g: '', f: 'Sub B' },
              { x: 'B', y: 1, g: '', f: 'Sub B' },

              { x: 'A', y: 1, g: null, f: 'Sub A' },
              { x: '', y: 1, g: null, f: 'Sub A' },
              { x: null, y: 1, g: null, f: 'Sub A' },
              { x: 'B', y: 1, g: null, f: 'Sub A' },

              { x: 'A', y: 1, g: null, f: 'Sub B' },
              { x: '', y: 1, g: null, f: 'Sub B' },
              { x: null, y: 1, g: null, f: 'Sub B' },
              { x: 'B', y: 1, g: null, f: 'Sub B' },
            ],
          },
        }),
        formatFactory,
      },
      XYChart,
      true
    );
    // 3 categorical values
    expect(debugState?.axes?.x[0]?.labels).toEqual(['A', EMPTY_LABEL, NULL_LABEL, 'B']);
    // two series
    expect(debugState?.bars?.map((b) => b.name)).toEqual([
      'Group A › Sub A',
      'Group A › Sub B',
      `${EMPTY_LABEL} › Sub A`,
      `${EMPTY_LABEL} › Sub B`,
      // These two are not right, these labels should be also converted
      `${NULL_LABEL} › Sub A`,
      `${NULL_LABEL} › Sub B`,
    ]);
  });
});
