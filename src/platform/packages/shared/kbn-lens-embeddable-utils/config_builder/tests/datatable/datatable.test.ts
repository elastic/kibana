/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';

import type { DatatableConfig } from '../../schema';
import { datatableConfigSchema, lensApiConfigSchema } from '../../schema';
import { AUTO_COLOR } from '../../schema/color';
import { LensConfigBuilder } from '../../config_builder';
import type { LensAttributes } from '../../types';
import { validator } from '../utils/validator';
import {
  singleMetricDatatableAttributes,
  singleMetricRowSplitDatatableAttributes,
  multiMetricRowSplitDatatableAttributes,
  fullConfigDatatableAttributes,
  sortedByTransposedMetricColumnDatatableAttributes,
  sortedByRowDatatableAttributes,
  defaultColorByValueAttributes,
  selectorColorByValueAttributes,
  progressBarDatatableAttributes,
} from './lens_state_config_dsl.mock';
import {
  singleMetricESQLDatatableAttributes,
  singleMetricRowSplitESQLDatatableAttributes,
  multipleMetricRowSplitESQLDatatableAttributes,
  fullConfigESQLDatatableAttributes,
  sortedByTransposedMetricColumnESQLDatatableAttributes,
  progressBarESQLDatatableAttributes,
} from './lens_state_config_esql.mock';
import {
  singleMetricDatatableWithAdhocDataView,
  multiMetricRowSplitByDatatableWithAdhocDataView,
  fullConfigDatatableWithAdhocDataView,
  fullConfigDatatableWithDataView,
  sortedByPivotedMetricColumnDatatable,
  sortedByRowDatatable,
  progressBarDatatable,
} from './lens_api_config_dsl.mock';
import {
  singleMetricESQLDatatable,
  multipleMetricRowSplitESQLDatatable,
  fullConfigESQLDatatable,
  sortedByPivotedMetricColumnESQLDatatable,
  sortedByRowColumnESQLDatatable,
  progressBarESQLDatatable,
} from './lens_api_config_esql.mock';

function toDatatableApiConfig(
  builder: LensConfigBuilder,
  lensState: LensAttributes
): DatatableConfig {
  const apiConfig = builder.toAPIFormat(lensState);

  if (apiConfig.type !== 'data_table') {
    throw new Error('Expected datatable API config');
  }

  return apiConfig;
}

describe('Datatable', () => {
  describe('state transform validation', () => {
    it('should convert a datatable chart with single metric column', () => {
      validator.data_table.fromState(singleMetricDatatableAttributes);
    });

    it('should convert a datatable chart with single metric, row, split by columns', () => {
      validator.data_table.fromState(singleMetricRowSplitDatatableAttributes);
    });

    it('should convert a datatable chart with multiple metrics, rows, split by columns', () => {
      validator.data_table.fromState(multiMetricRowSplitDatatableAttributes);
    });

    it('should convert a datatable chart with full config', () => {
      validator.data_table.fromState(fullConfigDatatableAttributes);
    });

    it('should convert a datatable chart sorted by a transposed metric column', () => {
      validator.data_table.fromState(sortedByTransposedMetricColumnDatatableAttributes);
    });

    it('should convert a datatable chart sorted by a row', () => {
      validator.data_table.fromState(sortedByRowDatatableAttributes);
    });

    it('should convert an ESQL datatable chart with single metric column', () => {
      validator.data_table.fromState(singleMetricESQLDatatableAttributes);
    });

    it('should convert an ESQL datatable chart with single metric, row, split by columns', () => {
      validator.data_table.fromState(singleMetricRowSplitESQLDatatableAttributes);
    });

    it('should convert an ESQL datatable chart with multiple metrics, rows, split by columns', () => {
      validator.data_table.fromState(multipleMetricRowSplitESQLDatatableAttributes);
    });

    it('should convert an ESQL datatable chart with full config', () => {
      validator.data_table.fromState(fullConfigESQLDatatableAttributes);
    });

    it('should convert an ESQL datatable chart sorted by a transposed metric column', () => {
      validator.data_table.fromState(sortedByTransposedMetricColumnESQLDatatableAttributes);
    });

    it('should convert a default color by value palette', () => {
      validator.data_table.fromState(defaultColorByValueAttributes);
    });

    it('should convert a selector color by value palette', () => {
      validator.data_table.fromState(selectorColorByValueAttributes);
    });

    it('should convert a datatable chart with progress bars', () => {
      validator.data_table.fromState(progressBarDatatableAttributes);
    });

    it('should convert an ESQL datatable chart with progress bars', () => {
      validator.data_table.fromState(progressBarESQLDatatableAttributes);
    });
  });

  describe('api transform validation', () => {
    it('should convert a datatable chart with single metric column', () => {
      validator.data_table.fromApi(singleMetricDatatableWithAdhocDataView);
    });

    it('should convert a datatable chart with multiple metrics, rows, split by columns', () => {
      validator.data_table.fromApi(multiMetricRowSplitByDatatableWithAdhocDataView);
    });

    it('should convert a datatable chart with full config and ad hoc dataView', () => {
      validator.data_table.fromApi(fullConfigDatatableWithAdhocDataView);
    });

    it('should convert a datatable chart with full config and dataView', () => {
      validator.data_table.fromApi(fullConfigDatatableWithDataView);
    });

    it('should convert a datatable chart sorted by a transposed column', () => {
      validator.data_table.fromApi(sortedByPivotedMetricColumnDatatable);
    });

    it('should convert a datatable chart sorted by a row column', () => {
      validator.data_table.fromApi(sortedByRowDatatable);
    });

    it('should convert an ESQL datatable chart with single metric column', () => {
      validator.data_table.fromApi(singleMetricESQLDatatable);
    });

    it('should convert an ESQL datatable chart with multiple metrics, rows, split by columns', () => {
      validator.data_table.fromApi(multipleMetricRowSplitESQLDatatable);
    });

    it('should convert an ESQL datatable chart with full config', () => {
      validator.data_table.fromApi(fullConfigESQLDatatable);
    });

    it('should convert an ESQL datatable chart sorted by a transposed column', () => {
      validator.data_table.fromApi(sortedByPivotedMetricColumnESQLDatatable);
    });

    it('should convert an ESQL datatable chart sorted by a row column', () => {
      validator.data_table.fromApi(sortedByRowColumnESQLDatatable);
    });

    it('should convert a datatable chart with progress bars', () => {
      validator.data_table.fromApi(progressBarDatatable);
    });

    it('should convert an ESQL datatable chart with progress bars', () => {
      validator.data_table.fromApi(progressBarESQLDatatable);
    });
  });

  describe('progress bar', () => {
    const builder = new LensConfigBuilder(undefined, true);
    const statusPalette = { type: 'distributed_palette', palette: 'status' };

    it('(SO -> API) should export the editor progress bars without the values kept for another fill mode', () => {
      const apiOutput = toDatatableApiConfig(builder, progressBarDatatableAttributes);

      expect(apiOutput.metrics).toEqual([
        expect.objectContaining({
          apply_color_to: 'progress_bar',
          fill_mode: 'gradient',
          color: statusPalette,
          value_range: { type: 'auto' },
          alignment: 'right',
        }),
        expect.objectContaining({
          apply_color_to: 'progress_bar',
          fill_mode: 'gradient',
          color: statusPalette,
          value_range: { type: 'custom', min: 8000, max: 10942.5 },
          alignment: 'right',
        }),
        expect.objectContaining({
          apply_color_to: 'progress_bar',
          fill_mode: 'single',
          color: { type: 'static', color: '#16C5C0' },
          value_range: { type: 'auto' },
          alignment: 'right',
        }),
        expect.objectContaining({
          apply_color_to: 'progress_bar',
          fill_mode: 'solid',
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: [
              { lt: 10000, color: '#24c292' },
              { gte: 10000, lte: 11000, color: '#aee8d2' },
            ],
          },
          value_range: { type: 'custom', min: 4179.1, max: 10942.5 },
          alignment: 'left',
        }),
      ]);
    });

    it('(SO -> API) should export the editor progress bars of an ESQL metric and row', () => {
      const apiOutput = toDatatableApiConfig(builder, progressBarESQLDatatableAttributes);

      expect(apiOutput.metrics).toEqual([
        expect.objectContaining({
          apply_color_to: 'progress_bar',
          fill_mode: 'gradient',
          color: statusPalette,
          value_range: { type: 'auto' },
          alignment: 'right',
        }),
      ]);
      expect(apiOutput.rows).toEqual([
        expect.objectContaining({
          apply_color_to: 'progress_bar',
          fill_mode: 'single',
          color: { type: 'static', color: '#16C5C0' },
          value_range: { type: 'auto' },
          alignment: 'left',
        }),
      ]);
    });

    it('(API -> SO -> API) should return dynamic colors with open and closed outer bounds unchanged', () => {
      const dslOutput = toDatatableApiConfig(builder, builder.fromAPIFormat(progressBarDatatable));
      const esqlOutput = toDatatableApiConfig(
        builder,
        builder.fromAPIFormat(progressBarESQLDatatable)
      );

      expect(dslOutput.metrics?.[2].color).toEqual(progressBarDatatable.metrics?.[2].color);
      expect(esqlOutput.metrics?.[1].color).toEqual(progressBarESQLDatatable.metrics?.[1].color);
    });

    it.each([
      ['DSL', progressBarDatatable],
      ['ESQL', progressBarESQLDatatable],
    ])('(API -> SO -> API) should return a stable %s config', (_label, config) => {
      const apiOutput = toDatatableApiConfig(
        builder,
        builder.fromAPIFormat(datatableConfigSchema.parse(config))
      );

      expect(lensApiConfigSchema.parse(apiOutput)).toEqual(apiOutput);
      expect(toDatatableApiConfig(builder, builder.fromAPIFormat(apiOutput))).toEqual(apiOutput);
    });
  });

  describe('color default application', () => {
    const baseDatatable = {
      type: 'data_table',
      title: 'Color default test',
      data_source: {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'test-index',
        time_field: '@timestamp',
      },
      sampling: 1,
      ignore_global_filters: false,
    } satisfies Pick<
      DatatableConfig,
      'type' | 'title' | 'data_source' | 'sampling' | 'ignore_global_filters'
    >;

    it('should apply AUTO_COLOR on a metric with apply_color_to', () => {
      const config = {
        ...baseDatatable,
        metrics: [
          {
            operation: 'count',
            empty_as_null: false,
            apply_color_to: 'value',
          },
        ],
      } satisfies DatatableConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = toDatatableApiConfig(builder, lensState);

      expect(apiOutput.metrics?.[0].color).toEqual(AUTO_COLOR);
      expect(apiOutput.metrics?.[0].apply_color_to).toBe('value');
    });

    it('should apply AUTO_COLOR on a row with apply_color_to', () => {
      const config = {
        ...baseDatatable,
        metrics: [{ operation: 'count', empty_as_null: false }],
        rows: [
          {
            operation: 'terms',
            fields: ['agent.keyword'],
            limit: 5,
            apply_color_to: 'background',
          },
        ],
      } satisfies DatatableConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = toDatatableApiConfig(builder, lensState);

      expect(apiOutput.rows?.[0].color).toEqual(AUTO_COLOR);
      expect(apiOutput.rows?.[0].apply_color_to).toBe('background');
    });

    it('should not apply a color on a metric when apply_color_to is not specified', () => {
      const config = {
        ...baseDatatable,
        metrics: [
          {
            operation: 'count',
            empty_as_null: false,
          },
        ],
      } satisfies DatatableConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = toDatatableApiConfig(builder, lensState);

      expect(apiOutput.metrics?.[0].color).not.toBeDefined();
      expect(apiOutput.metrics?.[0].apply_color_to).not.toBeDefined();
    });
  });
});
