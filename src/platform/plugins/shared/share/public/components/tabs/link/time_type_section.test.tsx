/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import { TimeTypeSection } from './time_type_section';

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
  });

  it('should render null when timeRange is not provided', () => {
    const onTimeTypeChange = jest.fn();

    renderComponent({
      isAbsoluteTimeByDefault: false,
      onTimeTypeChange,
    });

    const timeRangeSwitch = screen.queryByRole('switch');

    expect(timeRangeSwitch).not.toBeInTheDocument();
  });

  it('should render absolute time range', () => {
    const timeRange = { from: '2022-01-01T00:00:00.000Z', to: '2022-01-02T00:00:00.000Z' };
    const onTimeTypeChange = jest.fn();

    renderComponent({
      timeRange,
      isAbsoluteTimeByDefault: true,
      onTimeTypeChange,
    });

    const absoluteTimeInfoText = screen.getByTestId('absoluteTimeInfoText');

    expect(absoluteTimeInfoText).toBeInTheDocument();
    expect(screen.getByText(/January 01, 2022/)).toBeInTheDocument();
    expect(screen.getByText(/January 02, 2022/)).toBeInTheDocument();
  });

  it('should render relative time range', () => {
    const timeRange = { from: 'now', to: 'now+15m' };
    const onTimeTypeChange = jest.fn();

    renderComponent({
      timeRange,
      isAbsoluteTimeByDefault: false,
      onTimeTypeChange,
    });

    const timeRangeSwitch = screen.getByRole('switch');

    expect(timeRangeSwitch).not.toBeChecked();

    expect(screen.getByText('now')).toBeInTheDocument();
    expect(screen.getByText('in 15 minutes')).toBeInTheDocument();
  });

  it('should hide switch when timeRange is already absolute', () => {
    const timeRange = { from: '2022-01-01T00:00:00.000Z', to: '2022-01-02T00:00:00.000Z' };
    const onTimeTypeChange = jest.fn();

    renderComponent({
      timeRange,
      isAbsoluteTimeByDefault: true,
      onTimeTypeChange,
    });

    const timeRangeSwitch = screen.queryByRole('switch');

    expect(timeRangeSwitch).not.toBeInTheDocument();
  });

  it('should render with mixed time range (absolute from, relative to)', () => {
    const timeRange = { from: '2022-01-01T00:00:00.000Z', to: 'now' };
    const onTimeTypeChange = jest.fn();

    renderComponent({
      timeRange,
      isAbsoluteTimeByDefault: false,
      onTimeTypeChange,
    });

    const timeRangeSwitch = screen.getByRole('switch');

    expect(timeRangeSwitch).not.toBeChecked();

    expect(screen.getByText(/January 01, 2022/)).toBeInTheDocument();
    expect(screen.getByText('now')).toBeInTheDocument();
  });

  it('should render with mixed time range (relative from, absolute to)', () => {
    const timeRange = { from: 'now-30m', to: '2022-01-01T00:00:00.000Z' };
    const onTimeTypeChange = jest.fn();

    renderComponent({
      timeRange,
      isAbsoluteTimeByDefault: false,
      onTimeTypeChange,
    });

    const timeRangeSwitch = screen.getByRole('switch');

    expect(timeRangeSwitch).not.toBeChecked();

    expect(screen.getByText('30 minutes ago')).toBeInTheDocument();
    expect(screen.getByText(/January 01, 2022/)).toBeInTheDocument();
  });

  it('should render "now"', () => {
    const timeRange = { from: 'now-30m', to: 'now' };
    const onTimeTypeChange = jest.fn();

    renderComponent({
      timeRange,
      isAbsoluteTimeByDefault: false,
      onTimeTypeChange,
    });

    expect(screen.getByText('30 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('now')).toBeInTheDocument();
  });

  it('should handle plain "now" value correctly in mixed ranges', () => {
    const timeRange = { from: '2025-11-10T14:17:51.794Z', to: 'now' };
    const onTimeTypeChange = jest.fn();

    renderComponent({
      timeRange,
      isAbsoluteTimeByDefault: false,
      onTimeTypeChange,
    });

    expect(screen.getByText(/November 10, 2025/)).toBeInTheDocument();
    expect(screen.getByText('now')).toBeInTheDocument();
  });
});
