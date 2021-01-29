/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { TimeSeries } from '../../../visualizations/views/timeseries';
import TimeseriesVisualization from './vis';
import { setFieldFormats } from '../../../../services';
import { UI_SETTINGS } from '../../../../../../data/public';
import { getFieldFormatsRegistry } from '../../../../../../data/public/test_utils';

describe('TimeseriesVisualization', () => {
  describe('TimeSeries Y-Axis formatted value', () => {
    const config = {
      [UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN]: '0.[00]%',
      [UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0.0b',
    };
    const id = 'default';
    const value = 500;

    setFieldFormats(
      getFieldFormatsRegistry({
        uiSettings: { get: jest.fn() },
      })
    );

    const setupTimeSeriesPropsWithFormatters = (...formatters) => {
      const series = formatters.map((formatter) => ({
        id,
        formatter,
        data: [],
      }));

      const timeSeriesVisualization = shallow(
        <TimeseriesVisualization
          getConfig={(key) => config[key]}
          model={{
            id,
            series,
          }}
          visData={{
            [id]: {
              id,
              series,
            },
          }}
        />
      );

      return timeSeriesVisualization.find(TimeSeries).props();
    };

    test('should be byte for single byte series', () => {
      const timeSeriesProps = setupTimeSeriesPropsWithFormatters('byte');

      const yAxisFormattedValue = timeSeriesProps.yAxis[0].tickFormatter(value);

      expect(yAxisFormattedValue).toBe('500B');
    });

    test('should have custom format for single series', () => {
      const timeSeriesProps = setupTimeSeriesPropsWithFormatters('0.00bitd');

      const yAxisFormattedValue = timeSeriesProps.yAxis[0].tickFormatter(value);

      expect(yAxisFormattedValue).toBe('500.00bit');
    });

    test('should be the same number for byte and percent series', () => {
      const timeSeriesProps = setupTimeSeriesPropsWithFormatters('byte', 'percent');

      const yAxisFormattedValue = timeSeriesProps.yAxis[0].tickFormatter(value);

      expect(yAxisFormattedValue).toBe(value);
    });

    test('should be the same stringified number for byte and percent series', () => {
      const timeSeriesProps = setupTimeSeriesPropsWithFormatters('byte', 'percent');

      const yAxisFormattedValue = timeSeriesProps.yAxis[0].tickFormatter(value.toString());

      expect(yAxisFormattedValue).toBe('500');
    });

    test('should be byte for two byte formatted series', () => {
      const timeSeriesProps = setupTimeSeriesPropsWithFormatters('byte', 'byte');

      const yAxisFormattedValue = timeSeriesProps.yAxis[0].tickFormatter(value);
      const firstSeriesFormattedValue = timeSeriesProps.series[0].tickFormat(value);

      expect(firstSeriesFormattedValue).toBe('500B');
      expect(yAxisFormattedValue).toBe(firstSeriesFormattedValue);
    });

    test('should be percent for three percent formatted series', () => {
      const timeSeriesProps = setupTimeSeriesPropsWithFormatters('percent', 'percent', 'percent');

      const yAxisFormattedValue = timeSeriesProps.yAxis[0].tickFormatter(value);
      const firstSeriesFormattedValue = timeSeriesProps.series[0].tickFormat(value);

      expect(firstSeriesFormattedValue).toBe('50000%');
      expect(yAxisFormattedValue).toBe(firstSeriesFormattedValue);
    });
  });
});
