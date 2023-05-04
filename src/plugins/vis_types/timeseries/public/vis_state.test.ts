/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { updateOldState } from '@kbn/visualizations-plugin/public';

/**
 * The reason we add this test is to ensure that `convertNumIdsToStringsForTSVB` of the updateOldState runs correctly
 * for the TSVB vis state. As the `updateOldState` runs on the visualizations plugin. a change to our objects structure can
 * result to forget this case.
 * Just for reference the `convertNumIdsToStringsForTSVB` finds and converts the series and metrics ids that have  only digits to strings
 * by adding an x prefix. Number ids are never been generated from the editor, only programmatically.
 * See https://github.com/elastic/kibana/issues/113601.
 */
describe('TimeseriesVisState', () => {
  test('should format the TSVB visState correctly', () => {
    const visState = {
      title: 'test',
      type: 'metrics',
      aggs: [],
      params: {
        time_range_mode: 'entire_time_range',
        id: '0ecc58b1-30ba-43b9-aa3f-9ac32b482497',
        type: 'timeseries',
        series: [
          {
            id: '1',
            color: '#68BC00',
            split_mode: 'terms',
            palette: {
              type: 'palette',
              name: 'default',
            },
            metrics: [
              {
                id: '10',
                type: 'count',
              },
            ],
            separate_axis: 0,
            axis_position: 'right',
            formatter: 'default',
            chart_type: 'line',
            line_width: 1,
            point_size: 1,
            fill: 0.5,
            stacked: 'none',
            terms_field: 'Cancelled',
          },
        ],
        time_field: '',
        use_kibana_indexes: true,
        interval: '',
        axis_position: 'left',
        axis_formatter: 'number',
        axis_scale: 'normal',
        show_legend: 1,
        truncate_legend: 1,
        max_lines_legend: 1,
        show_grid: 1,
        tooltip_mode: 'show_all',
        drop_last_bucket: 0,
        isModelInvalid: false,
        index_pattern: {
          id: '665cd2c0-21d6-11ec-b42f-f7077c64d21b',
        },
      },
    };
    const newVisState = updateOldState(visState);
    expect(newVisState).toEqual({
      aggs: [],
      params: {
        axis_formatter: 'number',
        axis_position: 'left',
        axis_scale: 'normal',
        drop_last_bucket: 0,
        id: '0ecc58b1-30ba-43b9-aa3f-9ac32b482497',
        index_pattern: {
          id: '665cd2c0-21d6-11ec-b42f-f7077c64d21b',
        },
        interval: '',
        isModelInvalid: false,
        max_lines_legend: 1,
        series: [
          {
            axis_position: 'right',
            chart_type: 'line',
            color: '#68BC00',
            fill: 0.5,
            formatter: 'default',
            id: 'x1',
            line_width: 1,
            metrics: [
              {
                id: 'x10',
                type: 'count',
              },
            ],
            palette: {
              name: 'default',
              type: 'palette',
            },
            point_size: 1,
            separate_axis: 0,
            split_mode: 'terms',
            stacked: 'none',
            terms_field: 'Cancelled',
          },
        ],
        show_grid: 1,
        show_legend: 1,
        time_field: '',
        time_range_mode: 'entire_time_range',
        tooltip_mode: 'show_all',
        truncate_legend: 1,
        type: 'timeseries',
        use_kibana_indexes: true,
      },
      title: 'test',
      type: 'metrics',
    });
  });
});
