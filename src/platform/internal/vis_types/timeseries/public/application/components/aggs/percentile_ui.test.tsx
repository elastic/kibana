/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
// @ts-ignore not-typed yet
import { Percentiles } from './percentile_ui';
import { ColorPicker } from '../color_picker';

describe('Percentiles', () => {
  const props = {
    name: 'percentiles',
    model: {
      values: ['100', '200'],
      colors: ['#00028', 'rgba(96,146,192,1)'],
      percentiles: [
        {
          id: 'ece1c4b0-fb4b-11eb-a845-3de627f78e15',
          mode: 'line',
          shade: 0.2,
          color: '#00028',
          value: 50,
        },
      ],
    },
    panel: {
      time_range_mode: 'entire_time_range',
      series: [
        {
          axis_position: 'right',
          chart_type: 'line',
          color: '#68BC00',
          fill: 0.5,
          formatter: 'number',
          id: '64e4b07a-206e-4a0d-87e1-d6f5864f4acb',
          label: '',
          line_width: 1,
          metrics: [
            {
              values: ['100', '200'],
              colors: ['#68BC00', 'rgba(96,146,192,1)'],
              field: 'AvgTicketPrice',
              id: 'a64ed16c-c642-4705-8045-350206595530',
              type: 'percentile',
              percentiles: [
                {
                  id: 'ece1c4b0-fb4b-11eb-a845-3de627f78e15',
                  mode: 'line',
                  shade: 0.2,
                  color: '#68BC00',
                  value: 50,
                },
              ],
            },
          ],
          palette: {
            name: 'default',
            type: 'palette',
          },
          point_size: 1,
          separate_axis: 0,
          split_mode: 'everything',
          stacked: 'none',
          type: 'timeseries',
        },
      ],
      show_grid: 1,
      show_legend: 1,
      time_field: '',
      tooltip_mode: 'show_all',
      type: 'timeseries',
      use_kibana_indexes: true,
    },
    seriesId: '64e4b07a-206e-4a0d-87e1-d6f5864f4acb',
    id: 'iecdd7ef1-fb4b-11eb-8db9-69be3a5b3be0',
    onBlur: jest.fn(),
    onChange: jest.fn(),
    onFocus: jest.fn(),
  };

  const wrapper = shallowWithIntl(<Percentiles {...props} />);

  it('displays a color picker if is not grouped by', () => {
    expect(wrapper.find(ColorPicker).length).toEqual(1);
  });

  it('sets the picker color to the model color', () => {
    expect(wrapper.find(ColorPicker).prop('value')).toEqual('#00028');
  });

  it('should have called the onChange function on color change', () => {
    wrapper.find(ColorPicker).simulate('change');
    expect(props.onChange).toHaveBeenCalled();
  });
});
