/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import { datatableStateSchema } from '../../schema';
import type { DatatableState } from '../../schema';
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
      validateConverter(singleMetricDatatableAttributes, datatableStateSchema);
    });

    it('should convert a datatable chart with single metric, row, split by columns', () => {
      validateConverter(singleMetricRowSplitDatatableAttributes, datatableStateSchema);
    });

    it('should convert a datatable chart with multiple metrics, rows, split by columns', () => {
      validateConverter(multiMetricRowSplitDatatableAttributes, datatableStateSchema);
    });

    it('should convert a datatable chart with full config', () => {
      validateConverter(fullConfigDatatableAttributes, datatableStateSchema);
    });

    it('should convert a datatable chart sorted by a transposed metric column', () => {
      validateConverter(sortedByTransposedMetricColumnDatatableAttributes, datatableStateSchema);
    });

    it('should convert a datatable chart sorted by a row', () => {
      validateConverter(sortedByRowDatatableAttributes, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart with single metric column', () => {
      validateConverter(singleMetricESQLDatatableAttributes, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart with single metric, row, split by columns', () => {
      validateConverter(singleMetricRowSplitESQLDatatableAttributes, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart with multiple metrics, rows, split by columns', () => {
      validateConverter(multipleMetricRowSplitESQLDatatableAttributes, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart with full config', () => {
      validateConverter(fullConfigESQLDatatableAttributes, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart sorted by a transposed metric column', () => {
      validateConverter(
        sortedByTransposedMetricColumnESQLDatatableAttributes,
        datatableStateSchema
      );
    });

    it('should convert a default color by value palette', () => {
      validateConverter(defaultColorByValueAttributes, datatableStateSchema);
    });

    it('should convert a selector color by value palette', () => {
      validateConverter(selectorColorByValueAttributes, datatableStateSchema);
    });
  });
  describe('validateAPIConverter ', () => {
    it('should convert a datatable chart with single metric column', () => {
      validateAPIConverter(singleMetricDatatableWithAdhocDataView, datatableStateSchema);
    });

    it('should convert a datatable chart with multiple metrics, rows, split by columns', () => {
      validateAPIConverter(multiMetricRowSplitByDatatableWithAdhocDataView, datatableStateSchema);
    });

    it('should convert a datatable chart with full config and ad hoc dataView', () => {
      validateAPIConverter(fullConfigDatatableWithAdhocDataView, datatableStateSchema);
    });

    it('should convert a datatable chart with full config and dataView', () => {
      validateAPIConverter(fullConfigDatatableWithDataView, datatableStateSchema);
    });

    it('should convert a datatable chart sorted by a transposed column', () => {
      validateAPIConverter(sortedByPivotedMetricColumnDatatable, datatableStateSchema);
    });

    it('should convert a datatable chart sorted by a row column', () => {
      validateAPIConverter(sortedByRowDatatable, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart with single metric column', () => {
      validateAPIConverter(singleMetricESQLDatatable, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart with multiple metrics, rows, split by columns', () => {
      validateAPIConverter(multipleMetricRowSplitESQLDatatable, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart with full config', () => {
      validateAPIConverter(fullConfigESQLDatatable, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart sorted by a transposed column', () => {
      validateAPIConverter(sortedByPivotedMetricColumnESQLDatatable, datatableStateSchema);
    });

    it('should convert an ESQL datatable chart sorted by a row column', () => {
      validateAPIConverter(sortedByRowColumnESQLDatatable, datatableStateSchema);
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
      } satisfies DatatableState;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as DatatableState;

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
      } satisfies DatatableState;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as DatatableState;

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
      } satisfies DatatableState;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as DatatableState;

      expect(apiOutput.metrics?.[0].color).not.toBeDefined();
      expect(apiOutput.metrics?.[0].apply_color_to).not.toBeDefined();
    });
  });
});
