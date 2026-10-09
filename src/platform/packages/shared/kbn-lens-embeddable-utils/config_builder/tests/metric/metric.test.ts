/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import type { MetricVisualizationState, TermsIndexPatternColumn } from '@kbn/lens-common';

import { validator } from '../utils/validator';
import { DEFAULT_LAYER_ID } from '../../constants';
import type { MetricConfig } from '../../schema/charts/metric';
import { AUTO_COLOR, NO_COLOR } from '../../schema/color';
import { LensConfigBuilder } from '../../config_builder';
import {
  simpleMetricAttributes,
  breakdownMetricAttributes,
  complexMetricAttributes,
  breakdownMetricWithFormulaRefColumnsAttributes,
  selectorColorByValueAttributes,
  defaultColorByValueAttributes,
  dynamicColorsMetricAttributes,
} from './lens_state_config.mock';
import {
  simpleMetricAPIAttributes,
  breakdownMetricAPIAttributes,
  complexMetricAPIAttributes,
  complexESQLMetricAPIAttributes,
  esqlMetricWithTrendAPIAttributes,
  metricAPIWithTermsRankedBySecondary,
} from './lens_api_config.mock';

describe('Metric', () => {
  const baseMetric = {
    type: 'metric',
    title: 'Color default test',
    data_source: {
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'test-index',
      time_field: '@timestamp',
    },
    metrics: [
      {
        type: 'primary',
        operation: 'count',
        empty_as_null: false,
      },
    ],
    sampling: 1,
    ignore_global_filters: false,
  } satisfies MetricConfig;

  describe('state transform validation', () => {
    it('should convert a simple metric', () => {
      validator.metric.fromState(simpleMetricAttributes);
    });

    it('should convert a complex metric', () => {
      validator.metric.fromState(complexMetricAttributes);
    });

    it('should convert a breakdown-by metric', () => {
      validator.metric.fromState(breakdownMetricAttributes);
    });

    it('should convert a breakdown-by metric with formula reference columns and rank_by in the terms bucket operation', () => {
      validator.metric.fromState(breakdownMetricWithFormulaRefColumnsAttributes);
    });

    it('should convert a default color by value palette', () => {
      validator.metric.fromState(defaultColorByValueAttributes);
    });

    it('should convert a selector color by value palette', () => {
      validator.metric.fromState(selectorColorByValueAttributes);
    });

    it('should convert a dynamic colors metric', () => {
      validator.metric.fromState(dynamicColorsMetricAttributes);
    });
  });

  describe('api transform validation', () => {
    it('should convert a simple metric', () => {
      validator.metric.fromApi(simpleMetricAPIAttributes);
    });

    it('should convert a complex metric', () => {
      validator.metric.fromApi(complexMetricAPIAttributes);
    });

    it('should convert a breakdown-by metric', () => {
      validator.metric.fromApi(breakdownMetricAPIAttributes);
    });

    it('should convert a complex ESQL metric chart', () => {
      validator.metric.fromApi(complexESQLMetricAPIAttributes);
    });

    it('should convert an ESQL metric with trend background chart', () => {
      validator.metric.fromApi(esqlMetricWithTrendAPIAttributes);
    });

    it('should convert a metric with a terms agg ranked by secondary metric', () => {
      validator.metric.fromApi(metricAPIWithTermsRankedBySecondary);
    });
  });

  describe('trendline persistence', () => {
    it('should preserve an ESQL metric trendline when serializing renderable Lens state', () => {
      const builder = new LensConfigBuilder(undefined, true);
      const lensState = builder.fromAPIFormat(esqlMetricWithTrendAPIAttributes);
      const visualization = lensState.state.visualization as MetricVisualizationState;

      expect(visualization.trendlineLayerId).toBeDefined();
      expect(visualization.trendlineMetricAccessor).toBeDefined();
      expect(visualization.trendlineTimeAccessor).toBeDefined();

      delete visualization.trendlineLayerType;

      const apiOutput = builder.toAPIFormat(lensState) as MetricConfig;
      const [primaryMetric] = apiOutput.metrics;

      expect(primaryMetric).toMatchObject({
        type: 'primary',
        background_chart: { type: 'trend' },
      });
    });
  });

  describe('form-based trendline breakdown ordering', () => {
    const TRENDLINE_LAYER_ID = `${DEFAULT_LAYER_ID}_trendline`;

    const trendlineBreakdownConfig = {
      type: 'metric',
      title: 'Metric - Trendline with breakdown',
      data_source: {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'test-index',
        time_field: '@timestamp',
      },
      metrics: [
        {
          type: 'primary',
          operation: 'average',
          field: 'system.cpu',
          background_chart: { type: 'trend' },
        },
        {
          type: 'secondary',
          operation: 'average',
          field: 'bytes',
        },
      ],
      breakdown_by: {
        operation: 'terms',
        fields: ['host.name'],
        limit: 3,
        columns: 3,
        rank_by: { type: 'metric', metric_index: 0, direction: 'desc' },
      },
      sampling: 1,
      ignore_global_filters: false,
    } satisfies MetricConfig;

    const getTermsColumn = (
      lensState: ReturnType<LensConfigBuilder['fromAPIFormat']>,
      layerId: string,
      columnId: string
    ): TermsIndexPatternColumn => {
      const formBased = lensState.state.datasourceStates.formBased;
      if (!formBased) {
        throw new Error('expected a form-based datasource state');
      }
      return formBased.layers[layerId].columns[columnId] as TermsIndexPatternColumn;
    };

    it(`orders the trendline layer breakdown by the trendline layer's own metric column (rank_by primary)`, () => {
      const builder = new LensConfigBuilder(undefined, true);
      const lensState = builder.fromAPIFormat(trendlineBreakdownConfig);

      // The main layer breakdown orders by the main metric column.
      expect(
        getTermsColumn(lensState, DEFAULT_LAYER_ID, 'metric_accessor_breakdown').params.orderBy
      ).toEqual({ type: 'column', columnId: 'metric_accessor_metric' });

      // The trendline layer breakdown must order by the trendline layer's own metric column,
      // otherwise the runtime terms agg silently falls back to `_key` (alphabetical) ordering.
      const trendlineBreakdown = getTermsColumn(
        lensState,
        TRENDLINE_LAYER_ID,
        'metric_accessor_breakdown_trendline'
      );
      expect(trendlineBreakdown.params.orderBy).toEqual({
        type: 'column',
        columnId: 'metric_accessor_trendline',
      });

      // The referenced column must actually exist in the trendline layer.
      const trendlineLayer = lensState.state.datasourceStates.formBased!.layers[TRENDLINE_LAYER_ID];
      expect(trendlineLayer.columns).toHaveProperty('metric_accessor_trendline');
    });

    it('orders the trendline layer breakdown by the trendline secondary column (rank_by secondary)', () => {
      const config = {
        ...trendlineBreakdownConfig,
        breakdown_by: {
          ...trendlineBreakdownConfig.breakdown_by,
          rank_by: { type: 'metric', metric_index: 1, direction: 'desc' },
        },
      } satisfies MetricConfig;

      const builder = new LensConfigBuilder(undefined, true);
      const lensState = builder.fromAPIFormat(config);

      const trendlineBreakdown = getTermsColumn(
        lensState,
        TRENDLINE_LAYER_ID,
        'metric_accessor_breakdown_trendline'
      );
      expect(trendlineBreakdown.params.orderBy).toEqual({
        type: 'column',
        columnId: 'metric_accessor_secondary_trendlineX0',
      });

      const trendlineLayer = lensState.state.datasourceStates.formBased!.layers[TRENDLINE_LAYER_ID];
      expect(trendlineLayer.columns).toHaveProperty('metric_accessor_secondary_trendlineX0');
    });
  });

  describe('default application', () => {
    it('should emit AUTO_COLOR for primary metric when no color is specified', () => {
      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(baseMetric);
      const apiOutput = builder.toAPIFormat(lensState) as MetricConfig;

      expect(apiOutput.metrics[0].color).toEqual(AUTO_COLOR);
    });

    it('should emit NO_COLOR for secondary metric when no color is specified', () => {
      const config = {
        ...baseMetric,
        metrics: [
          ...baseMetric.metrics,
          {
            type: 'secondary',
            operation: 'average',
            field: 'bytes',
          },
        ],
      } satisfies MetricConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as MetricConfig;

      expect(apiOutput.metrics[0].color).toEqual(AUTO_COLOR);
      expect(apiOutput.metrics[1].color).toEqual(NO_COLOR);
    });

    it('should emit default density when no density is specified', () => {
      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(baseMetric);
      const apiOutput = builder.toAPIFormat(lensState) as MetricConfig;
      const visualization = lensState.state.visualization as MetricVisualizationState;

      expect(visualization.density).toBe('default');
      expect(apiOutput.styling?.density).toBe('default');
    });
  });

  describe('color by value named palette', () => {
    it('(API -> SO -> API) round-trips a named palette on a single-value metric as a numeric range', () => {
      const config = {
        ...baseMetric,
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            empty_as_null: false,
            color: {
              type: 'distributed_palette',
              palette: 'status',
            },
          },
        ],
      } satisfies MetricConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const viz = lensState.state.visualization as MetricVisualizationState;
      const apiOutput = builder.toAPIFormat(lensState) as MetricConfig;

      expect(viz.palette?.params?.rangeType).toBe('number');
      expect(viz.palette?.params?.continuity).toBe('all');
      expect(apiOutput.metrics[0].color).toEqual(config.metrics[0].color);
    });

    it('(API -> SO -> API) round-trips a named palette on a breakdown metric as a percentage range', () => {
      const config = {
        ...breakdownMetricAPIAttributes,
        metrics: [
          {
            type: 'primary',
            operation: 'count',
            empty_as_null: true,
            color: {
              type: 'distributed_palette',
              palette: 'temperature',
            },
          },
        ],
      } satisfies MetricConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const viz = lensState.state.visualization as MetricVisualizationState;
      const apiOutput = builder.toAPIFormat(lensState) as MetricConfig;

      expect(viz.palette?.params?.rangeType).toBe('percent');
      expect(apiOutput.metrics[0].color).toEqual(config.metrics[0].color);
    });

    it('(SO -> API -> SO) keeps the numeric range of a single-value named palette ', () => {
      const builder = new LensConfigBuilder();
      const api = builder.toAPIFormat(defaultColorByValueAttributes);
      const so = builder.fromAPIFormat(api);
      const viz = so.state.visualization as MetricVisualizationState;

      expect(viz.palette?.params?.rangeType).toBe('number');
      // A distributed palette always opens both bounds so out-of-range values stay colored
      expect(viz.palette?.params?.continuity).toBe('all');
      expect(viz.palette?.params?.steps).toBe(3);
      expect(viz.palette?.params?.stops).toBeUndefined();
      expect(viz.palette?.params?.colorStops).toBeUndefined();
    });

    it('(SO -> API -> SO) reconstructs a percentage range for a breakdown named palette even when the SO stored a numeric range', () => {
      // Breakdown shape reconstructs as `percent`, so a stored `number` range is intentionally contradictory.
      const attributes = structuredClone(breakdownMetricAttributes);
      const inViz = attributes.state.visualization as MetricVisualizationState;
      inViz.palette = {
        type: 'palette',
        name: 'status',
        params: {
          name: 'status',
          reverse: false,
          rangeType: 'number',
          // @ts-expect-error - null is allowed for rangeMin and rangeMax
          rangeMin: null,
          // @ts-expect-error - null is allowed for rangeMin and rangeMax
          rangeMax: null,
          progression: 'fixed',
          // correct stops
          stops: [
            {
              color: '#24c292',
              stop: 1548.66,
            },
            {
              color: '#fcd883',
              stop: 3097.33,
            },
            {
              color: '#f6726a',
              stop: 4646,
            },
          ],
          steps: 3,
          colorStops: [],
          continuity: 'all',
          maxSteps: 5,
        },
      };

      const builder = new LensConfigBuilder();
      const api = builder.toAPIFormat(attributes);
      const so = builder.fromAPIFormat(api);
      const outViz = so.state.visualization as MetricVisualizationState;

      expect(outViz.palette?.params?.rangeType).toBe('percent');
      expect(outViz.palette?.params?.steps).toBe(3);
      // A distributed palette always opens both bounds so out-of-range values stay colored
      expect(outViz.palette?.params?.continuity).toBe('all');
      expect(outViz.palette?.params?.stops).toBeUndefined();
      expect(outViz.palette?.params?.colorStops).toBeUndefined();
    });
  });
});
