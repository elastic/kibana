/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import type { DateHistogramIndexPatternColumn, TypedLensByValueInput } from '@kbn/lens-common';
import { LensConfigBuilder } from './config_builder';
import { mockDataViewsService } from './charts/mock_utils';
import { multiMetricRowSplitByDatatableWithAdhocDataView } from './tests/datatable/lens_api_config_dsl.mock';
import { basicTagcloudWithDataView } from './tests/tagcloud/lens_api_config.mock';
import { apiXYWithNoYTitleAndInsideLegend } from './tests/xy/basicXY.mock';

type LensAttributes = TypedLensByValueInput['attributes'];

const getDateHistogramColumn = (attributes: LensAttributes) => {
  const formBasedLayers = attributes.state.datasourceStates.formBased?.layers ?? {};

  for (const layer of Object.values(formBasedLayers)) {
    for (const column of Object.values(layer.columns)) {
      if (column.operationType === 'date_histogram') {
        return column as DateHistogramIndexPatternColumn;
      }
    }
  }
};

describe('LensConfigBuilder', () => {
  it('defaults empty rows off for built metric charts', async () => {
    const builder = new LensConfigBuilder(mockDataViewsService() as any);

    const result = (await builder.build({
      chartType: 'metric',
      title: 'Metric',
      dataset: {
        index: 'test',
        timeFieldName: '@timestamp',
      },
      value: 'count()',
      breakdown: {
        type: 'dateHistogram',
        field: '@timestamp',
      },
    })) as LensAttributes;

    expect(getDateHistogramColumn(result)?.params.includeEmptyRows).toBe(false);
  });

  it('defaults empty rows off for built bar charts', async () => {
    const builder = new LensConfigBuilder(mockDataViewsService() as any);

    const result = (await builder.build({
      chartType: 'xy',
      title: 'Bar',
      dataset: {
        index: 'test',
        timeFieldName: '@timestamp',
      },
      layers: [
        {
          type: 'series',
          seriesType: 'bar',
          xAxis: {
            type: 'dateHistogram',
            field: '@timestamp',
          },
          yAxis: [
            {
              value: 'count()',
            },
          ],
        },
      ],
    })) as LensAttributes;

    expect(result.state.visualization).toMatchObject({ preferredSeriesType: 'bar' });
    expect(getDateHistogramColumn(result)?.params.includeEmptyRows).toBe(false);
  });

  it('defaults empty rows off when converting XY API configs', () => {
    const builder = new LensConfigBuilder();
    const { include_empty_rows: _includeEmptyRows, ...x } =
      apiXYWithNoYTitleAndInsideLegend.layers[0].x;

    const result = builder.fromAPIFormat({
      ...apiXYWithNoYTitleAndInsideLegend,
      layers: [{ ...apiXYWithNoYTitleAndInsideLegend.layers[0], x }],
    }) as LensAttributes;

    expect(result.state.visualization).toMatchObject({ preferredSeriesType: 'bar_stacked' });
    expect(getDateHistogramColumn(result)?.params.includeEmptyRows).toBe(false);
  });

  it('defaults empty rows off when converting tag cloud API configs', () => {
    const builder = new LensConfigBuilder();
    const { include_empty_rows: _includeEmptyRows, ...tagBy } = basicTagcloudWithDataView.tag_by;

    const result = builder.fromAPIFormat({
      ...basicTagcloudWithDataView,
      tag_by: tagBy,
    }) as LensAttributes;

    expect(getDateHistogramColumn(result)?.params.includeEmptyRows).toBe(false);
  });

  it('defaults empty rows off when converting partition API configs', () => {
    const builder = new LensConfigBuilder();

    const result = builder.fromAPIFormat({
      title: 'Pie',
      type: 'pie',
      data_source: {
        type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
        ref_id: 'test-data-view',
      },
      ignore_global_filters: false,
      sampling: 1,
      metrics: [{ operation: 'count', empty_as_null: true }],
      group_by: [
        {
          operation: 'date_histogram',
          field: '@timestamp',
          suggested_interval: 'auto',
          use_original_time_range: false,
        },
      ],
    }) as LensAttributes;

    expect(getDateHistogramColumn(result)?.params.includeEmptyRows).toBe(false);
  });

  it('keeps empty rows on when converting datatable API configs', () => {
    const builder = new LensConfigBuilder();
    const rows = multiMetricRowSplitByDatatableWithAdhocDataView.rows.map((row) => {
      if (row.operation !== 'date_histogram') {
        return row;
      }

      const { include_empty_rows: _includeEmptyRows, ...dateHistogramRow } = row;
      return dateHistogramRow;
    });

    const result = builder.fromAPIFormat({
      ...multiMetricRowSplitByDatatableWithAdhocDataView,
      rows,
    }) as LensAttributes;

    expect(getDateHistogramColumn(result)?.params.includeEmptyRows).toBe(true);
  });
});
