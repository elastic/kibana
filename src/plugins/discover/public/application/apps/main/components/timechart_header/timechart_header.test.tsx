/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { ReactWrapper } from 'enzyme';
import { TimechartHeader, TimechartHeaderProps } from './timechart_header';
import { EuiIconTip } from '@elastic/eui';
import { findTestSubject } from '@elastic/eui/lib/test';
import { DataPublicPluginStart } from '../../../../../../../data/public';
import { FetchStatus } from '../../../../types';
import { BehaviorSubject } from 'rxjs';
import { Chart } from '../chart/point_series';
import { DataCharts$ } from '../../services/use_saved_search';

const chartData = ({
  xAxisOrderedValues: [
    1623880800000,
    1623967200000,
    1624053600000,
    1624140000000,
    1624226400000,
    1624312800000,
    1624399200000,
    1624485600000,
    1624572000000,
    1624658400000,
    1624744800000,
    1624831200000,
    1624917600000,
    1625004000000,
    1625090400000,
  ],
  xAxisFormat: { id: 'date', params: { pattern: 'YYYY-MM-DD' } },
  xAxisLabel: 'order_date per day',
  yAxisFormat: { id: 'number' },
  ordered: {
    date: true,
    interval: {
      asMilliseconds: jest.fn(),
    },
    intervalESUnit: 'd',
    intervalESValue: 1,
    min: '2021-03-18T08:28:56.411Z',
    max: '2021-07-01T07:28:56.411Z',
  },
  yAxisLabel: 'Count',
  values: [
    { x: 1623880800000, y: 134 },
    { x: 1623967200000, y: 152 },
    { x: 1624053600000, y: 141 },
    { x: 1624140000000, y: 138 },
    { x: 1624226400000, y: 142 },
    { x: 1624312800000, y: 157 },
    { x: 1624399200000, y: 149 },
    { x: 1624485600000, y: 146 },
    { x: 1624572000000, y: 170 },
    { x: 1624658400000, y: 137 },
    { x: 1624744800000, y: 150 },
    { x: 1624831200000, y: 144 },
    { x: 1624917600000, y: 147 },
    { x: 1625004000000, y: 137 },
    { x: 1625090400000, y: 66 },
  ],
} as unknown) as Chart;
describe('timechart header', function () {
  let props: TimechartHeaderProps;
  let component: ReactWrapper<TimechartHeaderProps>;

  beforeAll(() => {
    props = {
      data: {
        query: {
          timefilter: {
            timefilter: {
              getTime: () => {
                return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
              },
            },
          },
        },
      } as DataPublicPluginStart,
      dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
      stateInterval: 's',
      options: [
        {
          display: 'Auto',
          val: 'auto',
        },
        {
          display: 'Millisecond',
          val: 'ms',
        },
        {
          display: 'Second',
          val: 's',
        },
      ],
      onChangeInterval: jest.fn(),

      savedSearchData$: new BehaviorSubject({
        fetchStatus: FetchStatus.COMPLETE,
        chartData,
        bucketInterval: {
          scaled: false,
          description: 'second',
          scale: undefined,
        },
      }) as DataCharts$,
    };
  });

  it('TimechartHeader not renders an info text when the showScaledInfo property is not provided', () => {
    component = mountWithIntl(<TimechartHeader {...props} />);
    expect(component.find(EuiIconTip).length).toBe(0);
  });

  it('TimechartHeader renders an info when bucketInterval.scale is set to true', () => {
    props.savedSearchData$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      chartData,
      bucketInterval: {
        scaled: true,
        description: 'second',
        scale: undefined,
      },
    }) as DataCharts$;
    component = mountWithIntl(<TimechartHeader {...props} />);
    expect(component.find(EuiIconTip).length).toBe(1);
  });

  it('expect to render the date range', function () {
    component = mountWithIntl(<TimechartHeader {...props} />);
    const datetimeRangeText = findTestSubject(component, 'discoverIntervalDateRange');
    expect(datetimeRangeText.text()).toBe(
      'May 14, 2020 @ 11:05:13.590 - May 14, 2020 @ 11:20:13.590 per'
    );
  });

  it('expects to render a dropdown with the interval options', () => {
    component = mountWithIntl(<TimechartHeader {...props} />);
    const dropdown = findTestSubject(component, 'discoverIntervalSelect');
    expect(dropdown.length).toBe(1);
    // @ts-expect-error
    const values = dropdown.find('option').map((option) => option.prop('value'));
    expect(values).toEqual(['auto', 'ms', 's']);
    // @ts-expect-error
    const labels = dropdown.find('option').map((option) => option.text());
    expect(labels).toEqual(['Auto', 'Millisecond', 'Second']);
  });

  it('should change the interval', function () {
    component = mountWithIntl(<TimechartHeader {...props} />);
    findTestSubject(component, 'discoverIntervalSelect').simulate('change', {
      target: { value: 'ms' },
    });
    expect(props.onChangeInterval).toHaveBeenCalled();
  });
});
