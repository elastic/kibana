/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';

import { datatableConfigSchema } from '../../schema';
import type { DatatableConfig } from '../../schema';
import { AUTO_COLOR } from '../../schema/color';
import { LensConfigBuilder } from '../../config_builder';
import { validateAPIConverter, validateConverter } from '../validate';
import {
  singleMetricDatatableAttributes,
  singleMetricRowSplitDatatableAttributes,
  multiMetricRowSplitDatatableAttributes,
  fullConfigDatatableAttributes,
  sortedByTransposedMetricColumnDatatableAttributes,
  sortedByRowDatatableAttributes,
  defaultColorByValueAttributes,
  selectorColorByValueAttributes,
} from './lens_state_config_dsl.mock';
import {
  singleMetricESQLDatatableAttributes,
  singleMetricRowSplitESQLDatatableAttributes,
  multipleMetricRowSplitESQLDatatableAttributes,
  fullConfigESQLDatatableAttributes,
  sortedByTransposedMetricColumnESQLDatatableAttributes,
} from './lens_state_config_esql.mock';
import {
  singleMetricDatatableWithAdhocDataView,
  multiMetricRowSplitByDatatableWithAdhocDataView,
  fullConfigDatatableWithAdhocDataView,
  fullConfigDatatableWithDataView,
  sortedByPivotedMetricColumnDatatable,
  sortedByRowDatatable,
} from './lens_api_config_dsl.mock';
import {
  singleMetricESQLDatatable,
  multipleMetricRowSplitESQLDatatable,
  fullConfigESQLDatatable,
  sortedByPivotedMetricColumnESQLDatatable,
  sortedByRowColumnESQLDatatable,
} from './lens_api_config_esql.mock';

describe('Datatable', () => {
  describe('validateConverter', () => {
    it('should convert a datatable chart with single metric column', () => {
      validateConverter(singleMetricDatatableAttributes, datatableConfigSchema);
    });

    it('should convert a datatable chart with single metric, row, split by columns', () => {
      validateConverter(singleMetricRowSplitDatatableAttributes, datatableConfigSchema);
    });

    it('should convert a datatable chart with multiple metrics, rows, split by columns', () => {
      validateConverter(multiMetricRowSplitDatatableAttributes, datatableConfigSchema);
    });

    it('should convert a datatable chart with full config', () => {
      validateConverter(fullConfigDatatableAttributes, datatableConfigSchema);
    });

    it('should convert a datatable chart sorted by a transposed metric column', () => {
      validateConverter(sortedByTransposedMetricColumnDatatableAttributes, datatableConfigSchema);
    });

    it('should convert a datatable chart sorted by a row', () => {
      validateConverter(sortedByRowDatatableAttributes, datatableConfigSchema);
    });

    it('should convert an ESQL datatable chart with single metric column', () => {
      validateConverter(singleMetricESQLDatatableAttributes, datatableConfigSchema);
    });

    it('should convert an ESQL datatable chart with single metric, row, split by columns', () => {
      validateConverter(singleMetricRowSplitESQLDatatableAttributes, datatableConfigSchema);
    });

    it('should convert an ESQL datatable chart with multiple metrics, rows, split by columns', () => {
      validateConverter(multipleMetricRowSplitESQLDatatableAttributes, datatableConfigSchema);
    });

    it('should convert an ESQL datatable chart with full config', () => {
      validateConverter(fullConfigESQLDatatableAttributes, datatableConfigSchema);
    });

    it('should convert an ESQL datatable chart sorted by a transposed metric column', () => {
      validateConverter(
        sortedByTransposedMetricColumnESQLDatatableAttributes,
        datatableConfigSchema
      );
    });

    it('should convert a default color by value palette', () => {
      validateConverter(defaultColorByValueAttributes, datatableConfigSchema);
    });

    it('should convert a selector color by value palette', () => {
      validateConverter(selectorColorByValueAttributes, datatableConfigSchema);
    });
  });
  describe('validateAPIConverter ', () => {
    it('should convert a datatable chart with single metric column', () => {
      validateAPIConverter(singleMetricDatatableWithAdhocDataView, datatableConfigSchema);
    });

    it('should convert a datatable chart with multiple metrics, rows, split by columns', () => {
      validateAPIConverter(multiMetricRowSplitByDatatableWithAdhocDataView, datatableConfigSchema);
    });

    it('should convert a datatable chart with full config and ad hoc dataView', () => {
      validateAPIConverter(fullConfigDatatableWithAdhocDataView, datatableConfigSchema);
    });

    it('should convert a datatable chart with full config and dataView', () => {
      validateAPIConverter(fullConfigDatatableWithDataView, datatableConfigSchema);
    });

    it('should convert a datatable chart sorted by a transposed column', () => {
      validateAPIConverter(sortedByPivotedMetricColumnDatatable, datatableConfigSchema);
    });

    it('should convert a datatable chart sorted by a row column', () => {
      validateAPIConverter(sortedByRowDatatable, datatableConfigSchema);
    });

    it('should convert an ESQL datatable chart with single metric column', () => {
      validateAPIConverter(singleMetricESQLDatatable, datatableConfigSchema);
    });

    it('should convert an ESQL datatable chart with multiple metrics, rows, split by columns', () => {
      validateAPIConverter(multipleMetricRowSplitESQLDatatable, datatableConfigSchema);
    });

    it('should convert an ESQL datatable chart with full config', () => {
      validateAPIConverter(fullConfigESQLDatatable, datatableConfigSchema);
    });

    it('should convert an ESQL datatable chart sorted by a transposed column', () => {
      validateAPIConverter(sortedByPivotedMetricColumnESQLDatatable, datatableConfigSchema);
    });

    it('should convert an ESQL datatable chart sorted by a row column', () => {
      validateAPIConverter(sortedByRowColumnESQLDatatable, datatableConfigSchema);
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
    } as const;

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
      const apiOutput = builder.toAPIFormat(lensState) as DatatableConfig;

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
      const apiOutput = builder.toAPIFormat(lensState) as DatatableConfig;

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
      const apiOutput = builder.toAPIFormat(lensState) as DatatableConfig;

      expect(apiOutput.metrics?.[0].color).not.toBeDefined();
      expect(apiOutput.metrics?.[0].apply_color_to).not.toBeDefined();
    });
  });
});
