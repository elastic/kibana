/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import 'jest-canvas-mock';

import type { DataView } from '@kbn/data-views-plugin/public';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { LensAttributesBuilder } from './lens_attributes_builder';
import {
  MetricChart,
  MetricLayer,
  XYChart,
  XYDataLayer,
  XYReferenceLinesLayer,
} from './visualization_types';
import type { FormulaPublicApi, GenericIndexPatternColumn } from '@kbn/lens-plugin/public';
import { ReferenceBasedIndexPatternColumn } from '@kbn/lens-plugin/public/datasources/form_based/operations/definitions/column_types';
import type { FormulaValueConfig } from './types';

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: '@timestamp',
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
  fields: [],
  metaFields: [],
} as unknown as jest.Mocked<DataView>;

const lensPluginMockStart = lensPluginMock.createStartContract();

const getDataLayer = (formula: string): GenericIndexPatternColumn => ({
  customLabel: false,
  dataType: 'number',
  filter: undefined,
  isBucketed: false,
  label: formula,
  operationType: 'formula',
  params: {
    format: {
      id: 'percent',
    },
    formula,
    isFormulaBroken: true,
  } as any,
  reducedTimeRange: undefined,
  references: [],
  timeScale: undefined,
});

const getHistogramLayer = (interval: string, includeEmptyRows?: boolean) => ({
  dataType: 'date',
  isBucketed: true,
  label: '@timestamp',
  operationType: 'date_histogram',
  params: includeEmptyRows
    ? {
        includeEmptyRows,
        interval,
      }
    : { interval },
  scale: 'interval',
  sourceField: '@timestamp',
});

const REFERENCE_LINE_LAYER: ReferenceBasedIndexPatternColumn = {
  customLabel: true,
  dataType: 'number',
  isBucketed: false,
  isStaticValue: true,
  label: 'Reference',
  operationType: 'static_value',
  params: {
    format: {
      id: 'percent',
    },
    value: '1',
  } as any,
  references: [],
  scale: 'ratio',
};

const getFormula = (value: string): FormulaValueConfig => ({
  value,
  format: {
    id: 'percent',
  },
});

const AVERAGE_CPU_USER_FORMULA = 'average(system.cpu.user.pct)';
const AVERAGE_CPU_SYSTEM_FORMULA = 'average(system.cpu.system.pct)';

describe('lens_attributes_builder', () => {
  let formulaAPI: FormulaPublicApi;
  beforeAll(async () => {
    formulaAPI = (await lensPluginMockStart.stateHelperApi()).formula;
  });

  describe('MetricChart', () => {
    it('should build MetricChart', async () => {
      const metriChart = new MetricChart({
        layers: new MetricLayer({
          data: getFormula(AVERAGE_CPU_USER_FORMULA),
        }),

        dataView: mockDataView,
        formulaAPI,
      });
      const builder = new LensAttributesBuilder({ visualization: metriChart });

      const {
        state: { datasourceStates: datasourceStates, visualization },
      } = builder.build();

      const layers = datasourceStates.formBased?.layers;

      expect(layers).toEqual({
        layer: {
          columnOrder: ['metric_formula_accessor'],
          columns: {
            metric_formula_accessor: getDataLayer(AVERAGE_CPU_USER_FORMULA),
          },
          indexPatternId: 'mock-id',
        },
      });

      expect(visualization).toEqual({
        color: undefined,
        layerId: 'layer',
        layerType: 'data',
        metricAccessor: 'metric_formula_accessor',
        showBar: false,
        subtitle: undefined,
      });
    });

    it('should build MetricChart with trendline', async () => {
      const metriChart = new MetricChart({
        layers: new MetricLayer({
          data: getFormula(AVERAGE_CPU_USER_FORMULA),
          options: {
            showTrendLine: true,
          },
        }),

        dataView: mockDataView,
        formulaAPI,
      });
      const builder = new LensAttributesBuilder({ visualization: metriChart });
      const {
        state: { datasourceStates: datasourceStates, visualization },
      } = builder.build();

      const layers = datasourceStates.formBased?.layers;

      expect(layers).toEqual({
        layer: {
          columnOrder: ['metric_formula_accessor'],
          columns: {
            metric_formula_accessor: getDataLayer(AVERAGE_CPU_USER_FORMULA),
          },
          indexPatternId: 'mock-id',
        },
        layer_trendline: {
          columnOrder: ['x_date_histogram', 'metric_formula_accessor_trendline'],
          columns: {
            metric_formula_accessor_trendline: getDataLayer(AVERAGE_CPU_USER_FORMULA),
            x_date_histogram: getHistogramLayer('auto', true),
          },
          indexPatternId: 'mock-id',
          linkToLayers: ['layer'],
          sampling: 1,
        },
      });

      expect(visualization).toEqual({
        color: undefined,
        layerId: 'layer',
        layerType: 'data',
        metricAccessor: 'metric_formula_accessor',
        showBar: false,
        subtitle: undefined,
        trendlineLayerId: 'layer_trendline',
        trendlineLayerType: 'metricTrendline',
        trendlineMetricAccessor: 'metric_formula_accessor_trendline',
        trendlineTimeAccessor: 'x_date_histogram',
      });
    });
  });

  describe('XYChart', () => {
    it('should build XYChart', async () => {
      const xyChart = new XYChart({
        layers: [
          new XYDataLayer({
            data: [getFormula(AVERAGE_CPU_USER_FORMULA)],
            options: {
              buckets: { type: 'date_histogram' },
            },
          }),
        ],
        dataView: mockDataView,
        formulaAPI,
      });
      const builder = new LensAttributesBuilder({ visualization: xyChart });
      const {
        state: { datasourceStates: datasourceStates, visualization },
      } = builder.build();

      const layers = datasourceStates.formBased?.layers;

      expect(layers).toEqual({
        layer_0: {
          columnOrder: ['x_date_histogram', 'formula_accessor_0_0'],
          columns: {
            x_date_histogram: getHistogramLayer('auto'),
            formula_accessor_0_0: getDataLayer(AVERAGE_CPU_USER_FORMULA),
          },
          indexPatternId: 'mock-id',
        },
      });

      expect((visualization as any).layers).toEqual([
        {
          accessors: ['formula_accessor_0_0'],
          layerId: 'layer_0',
          layerType: 'data',
          seriesType: 'line',
          splitAccessor: undefined,
          xAccessor: 'x_date_histogram',
          yConfig: [],
        },
      ]);
    });

    it('should build XYChart with Reference Line layer', async () => {
      const xyChart = new XYChart({
        layers: [
          new XYDataLayer({
            data: [getFormula(AVERAGE_CPU_USER_FORMULA)],
            options: {
              buckets: { type: 'date_histogram' },
            },
          }),
          new XYReferenceLinesLayer({
            data: [
              {
                value: '1',
                format: {
                  id: 'percent',
                },
              },
            ],
          }),
        ],
        dataView: mockDataView,
        formulaAPI,
      });
      const builder = new LensAttributesBuilder({ visualization: xyChart });
      const {
        state: { datasourceStates: datasourceStates, visualization },
      } = builder.build();

      const layers = datasourceStates.formBased?.layers;

      expect(layers).toEqual({
        layer_0: {
          columnOrder: ['x_date_histogram', 'formula_accessor_0_0'],
          columns: {
            x_date_histogram: getHistogramLayer('auto'),
            formula_accessor_0_0: getDataLayer(AVERAGE_CPU_USER_FORMULA),
          },
          indexPatternId: 'mock-id',
        },
        layer_1_reference: {
          columnOrder: ['formula_accessor_1_0_reference_column'],
          columns: {
            formula_accessor_1_0_reference_column: REFERENCE_LINE_LAYER,
          },
          incompleteColumns: {},
          linkToLayers: [],
          sampling: 1,
        },
      });

      expect((visualization as any).layers).toEqual([
        {
          accessors: ['formula_accessor_0_0'],
          layerId: 'layer_0',
          layerType: 'data',
          seriesType: 'line',
          splitAccessor: undefined,
          xAccessor: 'x_date_histogram',
          yConfig: [],
        },
        {
          accessors: ['formula_accessor_1_0_reference_column'],
          layerId: 'layer_1_reference',
          layerType: 'referenceLine',
          yConfig: [
            {
              axisMode: 'left',
              color: undefined,
              forAccessor: 'formula_accessor_1_0_reference_column',
            },
          ],
        },
      ]);
    });

    it('should build XYChart with multiple data columns', async () => {
      const xyChart = new XYChart({
        layers: [
          new XYDataLayer({
            data: [getFormula(AVERAGE_CPU_USER_FORMULA), getFormula(AVERAGE_CPU_SYSTEM_FORMULA)],
            options: {
              buckets: { type: 'date_histogram' },
            },
          }),
        ],
        dataView: mockDataView,
        formulaAPI,
      });
      const builder = new LensAttributesBuilder({ visualization: xyChart });
      const {
        state: { datasourceStates: datasourceStates, visualization },
      } = builder.build();

      const layers = datasourceStates.formBased?.layers;

      expect(layers).toEqual({
        layer_0: {
          columnOrder: ['x_date_histogram', 'formula_accessor_0_0', 'formula_accessor_0_1'],
          columns: {
            x_date_histogram: getHistogramLayer('auto'),
            formula_accessor_0_0: getDataLayer(AVERAGE_CPU_USER_FORMULA),
            formula_accessor_0_1: getDataLayer(AVERAGE_CPU_SYSTEM_FORMULA),
          },
          indexPatternId: 'mock-id',
        },
      });

      expect((visualization as any).layers).toEqual([
        {
          accessors: ['formula_accessor_0_0', 'formula_accessor_0_1'],
          layerId: 'layer_0',
          layerType: 'data',
          seriesType: 'line',
          splitAccessor: undefined,
          xAccessor: 'x_date_histogram',
          yConfig: [],
        },
      ]);
    });
  });
});
