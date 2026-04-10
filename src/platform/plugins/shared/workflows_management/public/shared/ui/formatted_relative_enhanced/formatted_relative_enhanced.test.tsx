/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { FormattedRelativeEnhanced } from './formatted_relative_enhanced';

// Mock selectUnit from @formatjs/intl-utils
const mockSelectUnit = jest.fn();
jest.mock('@formatjs/intl-utils', () => ({
  selectUnit: (...args: unknown[]) => mockSelectUnit(...args),
}));

// Mock useFormattedDateTime
const mockUseFormattedDateTime = jest.fn();
jest.mock('../use_formatted_date', () => ({
  useFormattedDateTime: (...args: unknown[]) => mockUseFormattedDateTime(...args),
}));

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('FormattedRelativeEnhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-24T12:00:00Z'));
    mockUseFormattedDateTime.mockReturnValue('March 24, 2026 12:00:00 PM');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders "just now" when selectUnit returns second unit', () => {
    mockSelectUnit.mockReturnValue({ value: -5, unit: 'second' });

    const { container } = renderWithI18n(
      <FormattedRelativeEnhanced value={new Date('2026-03-24T11:59:55Z')} />
    );

    expect(container.textContent).toBe('just now');
  });

  it('renders relative time for minute unit', () => {
    mockSelectUnit.mockReturnValue({ value: -5, unit: 'minute' });

    renderWithI18n(<FormattedRelativeEnhanced value={new Date('2026-03-24T11:55:00Z')} />);

    // FormattedRelativeTime renders "5 minutes ago"
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('renders relative time for hour unit', () => {
    mockSelectUnit.mockReturnValue({ value: -3, unit: 'hour' });

    renderWithI18n(<FormattedRelativeEnhanced value={new Date('2026-03-24T09:00:00Z')} />);

    expect(screen.getByText('3 hours ago')).toBeInTheDocument();
  });

  it('renders relative time for day unit', () => {
    mockSelectUnit.mockReturnValue({ value: -2, unit: 'day' });

    renderWithI18n(<FormattedRelativeEnhanced value={new Date('2026-03-22T12:00:00Z')} />);

    expect(screen.getByText('2 days ago')).toBeInTheDocument();
  });

  describe('year boundary fix', () => {
    it('uses months when selectUnit returns year but diff is less than 180 days and more than 1 month', () => {
      // Simulate: selectUnit returns year=-1 (because of year boundary)
      // but the actual difference is only ~2 months
      mockSelectUnit.mockReturnValue({ value: -1, unit: 'year' });

      // Set current time to Jan 10, 2026
      jest.setSystemTime(new Date('2026-01-10T12:00:00Z'));

      // The date is Nov 10, 2025 (~2 months ago, crosses year boundary)
      renderWithI18n(<FormattedRelativeEnhanced value={new Date('2025-11-10T12:00:00Z')} />);

      // Should render months ago instead of "last year"
      expect(screen.queryByText('last year')).not.toBeInTheDocument();
      expect(screen.getByText('2 months ago')).toBeInTheDocument();
    });

    it('uses weeks when selectUnit returns year but diff is less than 1 month', () => {
      mockSelectUnit.mockReturnValue({ value: -1, unit: 'year' });

      // Set current time to Jan 10, 2026
      jest.setSystemTime(new Date('2026-01-10T12:00:00Z'));

      // The date is Dec 28, 2025 (~2 weeks ago, crosses year boundary)
      renderWithI18n(<FormattedRelativeEnhanced value={new Date('2025-12-28T12:00:00Z')} />);

      // Should render weeks ago instead of "last year"
      expect(screen.queryByText('last year')).not.toBeInTheDocument();
    });

    it('allows year unit when diff is more than 180 days', () => {
      mockSelectUnit.mockReturnValue({ value: -1, unit: 'year' });

      // Set current time to Dec 1, 2026
      jest.setSystemTime(new Date('2026-12-01T12:00:00Z'));

      // The date is Jan 1, 2026 (~11 months ago, > 180 days)
      renderWithI18n(<FormattedRelativeEnhanced value={new Date('2026-01-01T12:00:00Z')} />);

      // Should keep the year unit because diffDays >= 180
      expect(screen.getByText('1 year ago')).toBeInTheDocument();
    });
  });

  describe('fullDateTooltip', () => {
    it('does not render tooltip when fullDateTooltip is false', () => {
      mockSelectUnit.mockReturnValue({ value: -5, unit: 'minute' });

      const { container } = renderWithI18n(
        <FormattedRelativeEnhanced
          value={new Date('2026-03-24T11:55:00Z')}
          fullDateTooltip={false}
        />
      );

      // Should not call useFormattedDateTime since fullDateTooltip is false
      // (the WithTooltip component is not rendered)
      expect(container.querySelector('.euiToolTipAnchor')).not.toBeInTheDocument();
    });

    it('renders tooltip when fullDateTooltip is true', () => {
      mockSelectUnit.mockReturnValue({ value: -5, unit: 'minute' });

      const { container } = renderWithI18n(
        <FormattedRelativeEnhanced
          value={new Date('2026-03-24T11:55:00Z')}
          fullDateTooltip={true}
        />
      );

      // EuiToolTip wraps content in a span with class euiToolTipAnchor
      expect(container.querySelector('.euiToolTipAnchor')).toBeInTheDocument();
    });
  });

  describe('invalid date handling', () => {
    it('treats invalid date strings as current date', () => {
      mockSelectUnit.mockReturnValue({ value: 0, unit: 'second' });

      const { container } = renderWithI18n(<FormattedRelativeEnhanced value="not-a-valid-date" />);

      // moment('not-a-valid-date').isValid() is false, so it falls back to new Date()
      // selectUnit returns second, so "just now" is displayed
      expect(container.textContent).toBe('just now');
    });
  });
});
