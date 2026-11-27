/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import type { HeatmapVisualizationState } from '@kbn/lens-common';

import { validator } from '../utils/validator';
import type { HeatmapConfig } from '../../schema/charts/heatmap';
import { AUTO_COLOR } from '../../schema/color';
import { LensConfigBuilder } from '../../config_builder';
import * as dslMocks from './dsl.mocks';
import * as esqlMocks from './esql.mocks';
import * as esqlApiMocks from './lens_api_config.mock';

function toAPI(attributes: Parameters<LensConfigBuilder['toAPIFormat']>[0]): HeatmapConfig {
  const builder = new LensConfigBuilder();
  return builder.toAPIFormat(attributes) as HeatmapConfig;
}

describe('Heatmap', () => {
  describe('state transform validation', () => {
    describe('DSL', () => {
      it('should convert a simple heatmap', () => {
        validator.heatmap.fromState(dslMocks.simple);
      });

      it('should convert a heatmap with x and y axes', () => {
        validator.heatmap.fromState(dslMocks.withXAndYAxes);
      });

      it('should convert a heatmap with dynamic colors', () => {
        validator.heatmap.fromState(dslMocks.withDynamicColors);
      });

      it('should convert a heatmap with sort predicates', () => {
        validator.heatmap.fromState(dslMocks.withSortPredicates);
      });

      it('should convert a default color by value palette', () => {
        validator.heatmap.fromState(dslMocks.defaultColorByValueAttributes);
      });

      it('should convert a selector color by value palette', () => {
        validator.heatmap.fromState(dslMocks.selectorColorByValueAttributes);
      });

      it('should convert a heatmap with formula columns', () => {
        validator.heatmap.fromState(dslMocks.formulaColumns);
      });
    });

    describe('ESQL', () => {
      it('should convert a simple heatmap', () => {
        validator.heatmap.fromState(esqlMocks.simple);
      });

      it('should convert a heatmap with x and y axes', () => {
        validator.heatmap.fromState(esqlMocks.withXAndYAxes);
      });

      it('should convert a heatmap with sort predicates', () => {
        validator.heatmap.fromState(esqlMocks.withSortPredicates);
      });
    });
  });

  describe('api transform validation', () => {
    describe('DSL', () => {
      it.todo('should convert various dsl heatmap configs');
    });

    describe('ESQL', () => {
      it.todo('should convert various esql heatmap configs');
    });

    describe('axis scale support', () => {
      it('should convert temporal scale correctly', () => {
        const builder = new LensConfigBuilder();
        const lensState = builder.fromAPIFormat(esqlApiMocks.withTemporalXAxisScale);
        const outputConfig = builder.toAPIFormat(lensState) as HeatmapConfig;

        expect(outputConfig.axis?.x?.scale).toBe('temporal');

        validator.heatmap.fromApi(esqlApiMocks.withTemporalXAxisScale, ['axis.y']);
      });

      it('should convert ordinal scale correctly', () => {
        const builder = new LensConfigBuilder();
        const lensState = builder.fromAPIFormat(esqlApiMocks.withOrdinalXAxisScale);
        const outputConfig = builder.toAPIFormat(lensState) as HeatmapConfig;

        expect(outputConfig.axis?.x?.scale).toBe('ordinal');

        validator.heatmap.fromApi(esqlApiMocks.withOrdinalXAxisScale, ['axis.y']);
      });

      it('should convert linear scale correctly', () => {
        const builder = new LensConfigBuilder();
        const lensState = builder.fromAPIFormat(esqlApiMocks.withLinearXAxisScale);
        const outputConfig = builder.toAPIFormat(lensState) as HeatmapConfig;

        expect(outputConfig.axis?.x?.scale).toBe('linear');

        validator.heatmap.fromApi(esqlApiMocks.withLinearXAxisScale, ['axis.y']);
      });
    });
  });

  describe('axis.y omission when no yAccessor', () => {
    it('should omit axis.y for a DSL heatmap without yAccessor', () => {
      const apiOutput = toAPI(dslMocks.simple);
      expect(apiOutput.axis).not.toHaveProperty('y');
    });

    it('should omit axis.y for an ESQL heatmap without yAccessor', () => {
      const apiOutput = toAPI(esqlMocks.simple);
      expect(apiOutput.axis).not.toHaveProperty('y');
    });

    it('should include axis.y for a DSL heatmap with yAccessor', () => {
      const apiOutput = toAPI(dslMocks.withXAndYAxes);
      expect(apiOutput.axis).toHaveProperty('y');
    });

    it('should include axis.y for an ESQL heatmap with yAccessor', () => {
      const apiOutput = toAPI(esqlMocks.withXAndYAxes);
      expect(apiOutput.axis).toHaveProperty('y');
    });
  });

  describe('axis.y without a y dimension (API to state)', () => {
    const axis = {
      y: {
        title: { text: 'Y title', visible: true },
        labels: { visible: false },
        sort: 'desc',
      },
    } satisfies HeatmapConfig['axis'];

    const dslConfig = {
      type: 'heatmap',
      title: 'Y axis settings',
      data_source: {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'test-index',
        time_field: '@timestamp',
      },
      metric: { operation: 'count', empty_as_null: false },
      x: {
        operation: 'date_histogram',
        field: '@timestamp',
        include_empty_rows: false,
        suggested_interval: 'auto',
        use_original_time_range: true,
        drop_partial_intervals: false,
      },
      axis,
      sampling: 1,
      ignore_global_filters: false,
    } satisfies HeatmapConfig;

    const esqlConfig = {
      type: 'heatmap',
      title: 'Y axis settings',
      data_source: {
        type: 'esql',
        query: 'FROM logs | STATS count = count() BY bucket, host',
      },
      metric: { column: 'count' },
      x: { column: 'bucket' },
      axis,
      sampling: 1,
      ignore_global_filters: false,
    } satisfies HeatmapConfig;

    const heatmapsByDataSource: Array<[string, HeatmapConfig, HeatmapConfig]> = [
      [
        'DSL',
        dslConfig,
        { ...dslConfig, y: { operation: 'terms', fields: ['host.keyword'], limit: 5 } },
      ],
      ['ES|QL', esqlConfig, { ...esqlConfig, y: { column: 'host' } }],
    ];

    describe.each(heatmapsByDataSource)('with %s config', (_name, withoutY, withY) => {
      it('should not store the y axis settings when there is no y dimension', () => {
        const builder = new LensConfigBuilder();
        const lensState = builder.fromAPIFormat(withoutY);
        const { gridConfig } = lensState.state.visualization as HeatmapVisualizationState;

        expect(gridConfig.yTitle).toBeUndefined();
        expect(gridConfig.isYAxisTitleVisible).toBe(false);
        expect(gridConfig.isYAxisLabelVisible).toBe(true);
        expect(gridConfig.ySortPredicate).toBeUndefined();
      });

      it('should store the y axis settings when there is a y dimension', () => {
        const builder = new LensConfigBuilder();
        const lensState = builder.fromAPIFormat(withY);
        const { gridConfig } = lensState.state.visualization as HeatmapVisualizationState;

        expect(gridConfig.yTitle).toBe('Y title');
        expect(gridConfig.isYAxisTitleVisible).toBe(true);
        expect(gridConfig.isYAxisLabelVisible).toBe(false);
        expect(gridConfig.ySortPredicate).toBe('desc');
      });
    });
  });

  describe('color default application', () => {
    const baseHeatmap = {
      type: 'heatmap',
      title: 'Color default test',
      data_source: {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'test-index',
        time_field: '@timestamp',
      },
      metric: {
        operation: 'count',
        empty_as_null: false,
      },
      x: {
        operation: 'date_histogram',
        field: '@timestamp',
        include_empty_rows: false,
        suggested_interval: 'auto',
        use_original_time_range: true,
        drop_partial_intervals: false,
      },
      sampling: 1,
      ignore_global_filters: false,
    } satisfies HeatmapConfig;

    it('should emit AUTO_COLOR when no color is specified', () => {
      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(baseHeatmap);
      const apiOutput = builder.toAPIFormat(lensState) as HeatmapConfig;

      expect(apiOutput.metric.color).toEqual(AUTO_COLOR);
    });
  });
});
