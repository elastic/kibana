/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { TimeTypeSection } from './time_type_section';
import * as timeUtils from '../../../lib/time_utils';

describe('TimeTypeSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(timeUtils, 'convertRelativeTimeStringToAbsoluteTimeDate')
      .mockReturnValue(new Date());
    jest
      .spyOn(timeUtils, 'getRelativeTimeValueAndUnitFromTimeString')
      .mockImplementation((time) => {
        if (time === 'now') return { value: 0, unit: 'second' };
        if (time === 'now-1m') return { value: -1, unit: 'minute' };
        if (time === 'now-30m') return { value: -30, unit: 'minute' };
        return { value: 0, unit: 'second' };
      });
    jest.spyOn(timeUtils, 'isTimeRangeAbsoluteTime').mockReturnValue(false);
  });

  it('renders null when timeRange is not provided', () => {
    const component = mountWithIntl(
      <TimeTypeSection isAbsoluteTime={false} changeTimeType={jest.fn()} />
    );
    expect(component.html()).toBeNull();
  });

  it('renders with absolute time range', () => {
    const timeRange = { from: '2022-01-01T00:00:00.000Z', to: '2022-01-02T00:00:00.000Z' };
    const changeTypeHandler = jest.fn();

    const component = mountWithIntl(
      <TimeTypeSection
        timeRange={timeRange}
        isAbsoluteTime={true}
        changeTimeType={changeTypeHandler}
      />
    );

    expect(component.find('EuiSwitch').prop('checked')).toBe(true);
    expect(component.find('[data-test-subj="absoluteTimeInfoText"]')).toHaveLength(1);
  });

  it('renders with relative time range (from now to specific time)', () => {
    const timeRange = { from: 'now', to: 'now+15m' };
    const changeTypeHandler = jest.fn();

    const component = mountWithIntl(
      <TimeTypeSection
        timeRange={timeRange}
        isAbsoluteTime={false}
        changeTimeType={changeTypeHandler}
      />
    );

    expect(component.find('EuiSwitch').prop('checked')).toBe(false);
    expect(component.find('[data-test-subj="relativeTimeInfoTextFromNow"]')).toHaveLength(1);
  });

  it('renders with relative time range (from specific time to now)', () => {
    const timeRange = { from: 'now-30m', to: 'now' };
    const changeTypeHandler = jest.fn();

    const component = mountWithIntl(
      <TimeTypeSection
        timeRange={timeRange}
        isAbsoluteTime={false}
        changeTimeType={changeTypeHandler}
      />
    );

    expect(component.find('EuiSwitch').prop('checked')).toBe(false);
    expect(component.find('[data-test-subj="relativeTimeInfoTextToNow"]')).toHaveLength(1);
  });

  it('renders with relative time range (between two relative times)', () => {
    const timeRange = { from: 'now-30m', to: 'now-1m' };
    const changeTypeHandler = jest.fn();

    const component = mountWithIntl(
      <TimeTypeSection
        timeRange={timeRange}
        isAbsoluteTime={false}
        changeTimeType={changeTypeHandler}
      />
    );

    expect(component.find('EuiSwitch').prop('checked')).toBe(false);
    expect(component.find('[data-test-subj="relativeTimeInfoTextDefault"]')).toHaveLength(1);
  });

  it('disables switch when timeRange is already absolute', () => {
    const timeRange = { from: '2022-01-01T00:00:00.000Z', to: '2022-01-02T00:00:00.000Z' };
    const changeTypeHandler = jest.fn();

    jest.spyOn(timeUtils, 'isTimeRangeAbsoluteTime').mockReturnValue(true);

    const component = mountWithIntl(
      <TimeTypeSection
        timeRange={timeRange}
        isAbsoluteTime={true}
        changeTimeType={changeTypeHandler}
      />
    );

    expect(component.find('EuiSwitch').prop('disabled')).toBe(true);
  });
});
