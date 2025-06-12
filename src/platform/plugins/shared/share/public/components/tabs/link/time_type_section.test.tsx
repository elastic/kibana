/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import { TimeTypeSection } from './time_type_section';
import * as timeUtils from '../../../lib/time_utils';

const renderComponent = (props: ComponentProps<typeof TimeTypeSection>) => {
  render(
    <IntlProvider locale="en">
      <TimeTypeSection {...props} />
    </IntlProvider>
  );
};

describe('TimeTypeSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(timeUtils, 'convertRelativeTimeStringToAbsoluteTimeDate')
      .mockReturnValue(new Date());
    jest
      .spyOn(timeUtils, 'getRelativeTimeValueAndUnitFromTimeString')
      .mockImplementation((time) => {
        if (time === 'now') return { value: 0, unit: 'second', roundingUnit: undefined };
        if (time === 'now-1m') return { value: -1, unit: 'minute', roundingUnit: undefined };
        if (time === 'now-30m') return { value: -30, unit: 'minute', roundingUnit: undefined };
        return { value: 0, unit: 'second', roundingUnit: undefined };
      });
    jest.spyOn(timeUtils, 'isTimeRangeAbsoluteTime').mockReturnValue(false);
  });

  it('renders null when timeRange is not provided', () => {
    const changeTimeType = jest.fn();

    renderComponent({
      isAbsoluteTime: false,
      changeTimeType,
    });

    const timeRangeSwitch = screen.queryByRole('switch');

    expect(timeRangeSwitch).not.toBeInTheDocument();
  });

  it('renders with absolute time range', () => {
    const timeRange = { from: '2022-01-01T00:00:00.000Z', to: '2022-01-02T00:00:00.000Z' };
    const changeTimeType = jest.fn();

    renderComponent({
      timeRange,
      isAbsoluteTime: true,
      changeTimeType,
    });

    const timeRangeSwitch = screen.getByRole('switch');

    expect(timeRangeSwitch).toBeChecked();

    const absoluteTimeInfoText = screen.getByTestId('absoluteTimeInfoText');

    expect(absoluteTimeInfoText).toBeInTheDocument();
  });

  it('renders with relative time range (from now to specific time)', () => {
    const timeRange = { from: 'now', to: 'now+15m' };
    const changeTimeType = jest.fn();

    renderComponent({
      timeRange,
      isAbsoluteTime: false,
      changeTimeType,
    });

    const timeRangeSwitch = screen.getByRole('switch');

    expect(timeRangeSwitch).not.toBeChecked();

    const relativeTimeFromNowInfoText = screen.getByTestId('relativeTimeInfoTextFromNow');

    expect(relativeTimeFromNowInfoText).toBeInTheDocument();
  });

  it('renders with relative time range (from specific time to now)', () => {
    const timeRange = { from: 'now-30m', to: 'now' };
    const changeTimeType = jest.fn();

    renderComponent({
      timeRange,
      isAbsoluteTime: false,
      changeTimeType,
    });

    const timeRangeSwitch = screen.getByRole('switch');

    expect(timeRangeSwitch).not.toBeChecked();

    const relativeTimeToNowInfoText = screen.getByTestId('relativeTimeInfoTextToNow');

    expect(relativeTimeToNowInfoText).toBeInTheDocument();
  });

  it('renders with relative time range (between two relative times)', () => {
    const timeRange = { from: 'now-30m', to: 'now-1m' };
    const changeTimeType = jest.fn();

    renderComponent({
      timeRange,
      isAbsoluteTime: false,
      changeTimeType,
    });

    const timeRangeSwitch = screen.getByRole('switch');

    expect(timeRangeSwitch).not.toBeChecked();

    const relativeTimeInfoText = screen.getByTestId('relativeTimeInfoTextDefault');

    expect(relativeTimeInfoText).toBeInTheDocument();
  });

  it('disables switch when timeRange is already absolute', () => {
    const timeRange = { from: '2022-01-01T00:00:00.000Z', to: '2022-01-02T00:00:00.000Z' };
    const changeTimeType = jest.fn();

    jest.spyOn(timeUtils, 'isTimeRangeAbsoluteTime').mockReturnValue(true);

    renderComponent({
      timeRange,
      isAbsoluteTime: false,
      changeTimeType,
    });

    const timeRangeSwitch = screen.queryByRole('switch');

    expect(timeRangeSwitch).not.toBeInTheDocument();
  });
});
