/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';

import { heatmapConfigSchema } from '../../schema/charts/heatmap';
import type { HeatmapConfig } from '../../schema/charts/heatmap';
import { AUTO_COLOR } from '../../schema/color';
import { LensConfigBuilder } from '../../config_builder';
import { validateConverter } from '../validate';
import * as dslMocks from './dsl.mocks';
import * as esqlMocks from './esql.mocks';

describe('Heatmap', () => {
  describe('DSL', () => {
    it('should convert a simple heatmap', () => {
      validateConverter(dslMocks.simple, heatmapConfigSchema);
    });

    it('should convert a heatmap with x and y axes', () => {
      validateConverter(dslMocks.withXAndYAxes, heatmapConfigSchema);
    });

    it('should convert a heatmap with dynamic colors', () => {
      validateConverter(dslMocks.withDynamicColors, heatmapConfigSchema);
    });

    it('should convert a heatmap with sort predicates', () => {
      validateConverter(dslMocks.withSortPredicates, heatmapConfigSchema);
    });

    it('should convert a default color by value palette', () => {
      validateConverter(dslMocks.defaultColorByValueAttributes, heatmapConfigSchema);
    });

    it('should convert a selector color by value palette', () => {
      validateConverter(dslMocks.selectorColorByValueAttributes, heatmapConfigSchema);
    });
  });

  describe('ESQL', () => {
    it('should convert a simple heatmap', () => {
      validateConverter(esqlMocks.simple, heatmapConfigSchema);
    });

    it('should convert a heatmap with x and y axes', () => {
      validateConverter(esqlMocks.withXAndYAxes, heatmapConfigSchema);
    });

    it('should convert a heatmap with sort predicates', () => {
      validateConverter(esqlMocks.withSortPredicates, heatmapConfigSchema);
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
