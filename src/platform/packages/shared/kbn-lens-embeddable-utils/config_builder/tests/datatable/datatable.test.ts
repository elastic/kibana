/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import type { TypedLensSerializedState } from '@kbn/lens-common';

import type { DatatableConfig } from '../../schema';
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

type DatatableLensAttributes = Extract<
  TypedLensSerializedState['attributes'],
  { visualizationType: 'lnsDatatable' }
>;

function assertDatatableLensAttributes(
  attributes: LensAttributes
): asserts attributes is DatatableLensAttributes {
  if (attributes.visualizationType !== 'lnsDatatable') {
    throw new Error('Expected datatable Lens attributes');
  }
}

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

    it.each([
      ['DSL', singleMetricDatatableAttributes],
      ['ESQL', singleMetricESQLDatatableAttributes],
    ])(
      'should reject progress decoration when exporting a %s datatable to Lens as code',
      (_label, attributes) => {
        const progressDatatableAttributes = structuredClone(attributes);
        assertDatatableLensAttributes(progressDatatableAttributes);

        progressDatatableAttributes.state.visualization.columns[0] = {
          ...progressDatatableAttributes.state.visualization.columns[0],
          colorMode: 'progress',
          fillStyle: { fillMode: 'single', color: '#abcdef', valueRange: { mode: 'auto' } },
        };

        const builder = new LensConfigBuilder(undefined, true);

        expect(() => builder.toAPIFormat(progressDatatableAttributes)).toThrow(
          /unsupported 'progress' cell decoration/i
        );
      }
    );
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
