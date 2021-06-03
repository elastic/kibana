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
import { DataPublicPluginStart } from '../../../../../data/public';

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
      bucketInterval: {
        scaled: undefined,
        description: 'second',
        scale: undefined,
      },
    };
  });

  it('TimechartHeader not renders an info text when the showScaledInfo property is not provided', () => {
    component = mountWithIntl(<TimechartHeader {...props} />);
    expect(component.find(EuiIconTip).length).toBe(0);
  });

  it('TimechartHeader renders an info when bucketInterval.scale is set to true', () => {
    props.bucketInterval!.scaled = true;
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
