/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { TimeSeries } from '../../../visualizations/views/timeseries';
import TimeseriesVisualization from './vis';
import { setFieldFormats } from '../../../../services';
import { createFieldFormatter } from '../../lib/create_field_formatter';
import { FORMATS_UI_SETTINGS } from '../../../../../../../field_formats/common';
import { METRIC_TYPES } from '../../../../../../../data/common';
import { getFieldFormatsRegistry } from '../../../../../../../data/public/test_utils';

jest.mock('../../../../../../../data/public/services', () => ({
  getUiSettings: () => ({ get: jest.fn() }),
}));

describe('TimeseriesVisualization', () => {
  describe('TimeSeries Y-Axis formatted value', () => {
    const config = {
      [FORMATS_UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN]: '0.[00]%',
      [FORMATS_UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0.0b',
    };
    const id = 'default';
    const value = 500;

    setFieldFormats(
      getFieldFormatsRegistry({
        uiSettings: { get: jest.fn() },
      })
    );

    const setupTimeSeriesProps = (formatters, valueTemplates) => {
      const series = formatters.map((formatter, index) => ({
        id: id + index,
        formatter,
        value_template: valueTemplates?.[index],
        data: [],
        metrics: [
          {
            type: METRIC_TYPES.AVG,
            field: `field${index}`,
          },
        ],
      }));

      const fieldFormatMap = {
        field0: { id: 'duration', params: { inputFormat: 'years' } },
        field1: { id: 'duration', params: { inputFormat: 'years' } },
        field2: { id: 'duration', params: { inputFormat: 'months' } },
        field3: { id: 'number', params: { pattern: '$0,0.[00]' } },
      };

      const timeSeriesVisualization = shallow(
        <TimeseriesVisualization
          getConfig={(key) => config[key]}
          model={{
            id,
            series,
            use_kibana_indexes: true,
          }}
          visData={{
            [id]: {
              id,
              series,
            },
          }}
          fieldFormatMap={fieldFormatMap}
          createCustomFieldFormatter={createFieldFormatter}
        />
      );

      return timeSeriesVisualization.find(TimeSeries).props();
    };

    test('should return byte formatted value from yAxis formatter for single byte series', () => {
      const timeSeriesProps = setupTimeSeriesProps(['byte']);

      const yAxisFormattedValue = timeSeriesProps.yAxis[0].tickFormatter(value);

      expect(yAxisFormattedValue).toBe('500B');
    });

    test('should return custom formatted value from yAxis formatter for single series with custom formatter', () => {
      const timeSeriesProps = setupTimeSeriesProps(['0.00bitd']);

      const yAxisFormattedValue = timeSeriesProps.yAxis[0].tickFormatter(value);

      expect(yAxisFormattedValue).toBe('500.00bit');
    });

    test('should return the same number from yAxis formatter for byte and percent series', () => {
      const timeSeriesProps = setupTimeSeriesProps(['byte', 'percent']);

      const yAxisFormattedValue = timeSeriesProps.yAxis[0].tickFormatter(value);

      expect(yAxisFormattedValue).toBe(value);
    });

    test('should return the same stringified number from yAxis formatter for byte and percent series', () => {
      const timeSeriesProps = setupTimeSeriesProps(['byte', 'percent']);

      const yAxisFormattedValue = timeSeriesProps.yAxis[0].tickFormatter(value.toString());

      expect(yAxisFormattedValue).toBe('500');
    });

    test('should return byte formatted value from yAxis formatter and from two byte formatted series with the same value templates', () => {
      const timeSeriesProps = setupTimeSeriesProps(['byte', 'byte']);
      const { series, yAxis } = timeSeriesProps;

      expect(series[0].tickFormat(value)).toBe('500B');
      expect(series[1].tickFormat(value)).toBe('500B');
      expect(yAxis[0].tickFormatter(value)).toBe('500B');
    });

    test('should return simple number from yAxis formatter and different values from the same byte formatters, but with different value templates', () => {
      const timeSeriesProps = setupTimeSeriesProps(
        ['byte', 'byte'],
        ['{{value}}', '{{value}} value']
      );
      const { series, yAxis } = timeSeriesProps;

      expect(series[0].tickFormat(value)).toBe('500B');
      expect(series[1].tickFormat(value)).toBe('500B value');
      expect(yAxis[0].tickFormatter(value)).toBe(value);
    });

    test('should return percent formatted value from yAxis formatter and three percent formatted series with the same value templates', () => {
      const timeSeriesProps = setupTimeSeriesProps(['percent', 'percent', 'percent']);

      const yAxisFormattedValue = timeSeriesProps.yAxis[0].tickFormatter(value);
      const firstSeriesFormattedValue = timeSeriesProps.series[0].tickFormat(value);

      expect(firstSeriesFormattedValue).toBe('50000%');
      expect(yAxisFormattedValue).toBe(firstSeriesFormattedValue);
    });

    test('should return simple number from yAxis formatter and different values for the same value templates, but with different formatters', () => {
      const timeSeriesProps = setupTimeSeriesProps(
        ['number', 'byte'],
        ['{{value}} template', '{{value}} template']
      );
      const { series, yAxis } = timeSeriesProps;

      expect(series[0].tickFormat(value)).toBe('500 template');
      expect(series[1].tickFormat(value)).toBe('500B template');
      expect(yAxis[0].tickFormatter(value)).toBe(value);
    });

    test('should return field formatted value for yAxis and single series with default formatter', () => {
      const timeSeriesProps = setupTimeSeriesProps(['default']);
      const { series, yAxis } = timeSeriesProps;

      expect(series[0].tickFormat(value)).toBe('500 years');
      expect(yAxis[0].tickFormatter(value)).toBe('500 years');
    });

    test('should return custom field formatted value for yAxis and both series having same fieldFormats', () => {
      const timeSeriesProps = setupTimeSeriesProps(['default', 'default']);
      const { series, yAxis } = timeSeriesProps;

      expect(series[0].tickFormat(value)).toBe('500 years');
      expect(series[1].tickFormat(value)).toBe('500 years');
      expect(yAxis[0].tickFormatter(value)).toBe('500 years');
    });

    test('should return simple number from yAxis formatter and default formatted values for series', () => {
      const timeSeriesProps = setupTimeSeriesProps(['default', 'default', 'default', 'default']);
      const { series, yAxis } = timeSeriesProps;

      expect(series[0].tickFormat(value)).toBe('500 years');
      expect(series[1].tickFormat(value)).toBe('500 years');
      expect(series[2].tickFormat(value)).toBe('42 years');
      expect(series[3].tickFormat(value)).toBe('$500');
      expect(yAxis[0].tickFormatter(value)).toBe(value);
    });

    test('should return simple number from yAxis formatter and correctly formatted series values', () => {
      const timeSeriesProps = setupTimeSeriesProps(['default', 'byte', 'percent', 'default']);
      const { series, yAxis } = timeSeriesProps;

      expect(series[0].tickFormat(value)).toBe('500 years');
      expect(series[1].tickFormat(value)).toBe('500B');
      expect(series[2].tickFormat(value)).toBe('50000%');
      expect(series[3].tickFormat(value)).toBe('$500');
      expect(yAxis[0].tickFormatter(value)).toBe(value);
    });
  });
});
