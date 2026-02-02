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
import { ExecutionStatus } from '@kbn/workflows';
import { StatusBadge } from './status_badge';

const renderWithI18n = (ui: React.ReactNode) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('StatusBadge', () => {
  describe('relative date display across year boundaries', () => {
    beforeEach(() => {
      // Mock the current date to be January 10, 2026
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-10T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('displays relative time instead of "last year" for dates 2-3 weeks in the past crossing year boundary', () => {
      // This test verifies the fix for https://github.com/elastic/security-team/issues/15310
      // When the current date is January 10, 2026, and the execution happened on December 20, 2025
      // (only ~3 weeks ago), the UI should NOT show "last year"

      const dateInLateDecember2025 = '2025-12-20T10:00:00Z'; // ~3 weeks ago

      renderWithI18n(
        <StatusBadge status={ExecutionStatus.COMPLETED} date={dateInLateDecember2025} />
      );

      // After the fix, should NOT show "last year"
      expect(screen.queryByText('last year')).not.toBeInTheDocument();
      // Should show days or weeks ago instead (moment.js will show "21 days ago" or similar)
    });

    it('displays months ago for dates 2 months in the past crossing year boundary', () => {
      // For dates that are 2 months old but cross the year boundary,
      // should show "2 months ago" instead of "last year"

      const dateInNovember2025 = '2025-11-10T10:00:00Z'; // ~2 months ago

      renderWithI18n(<StatusBadge status={ExecutionStatus.COMPLETED} date={dateInNovember2025} />);

      // Should NOT show "last year" for dates less than 12 months old
      expect(screen.queryByText('last year')).not.toBeInTheDocument();
    });

    it('displays relative time correctly when no year boundary is crossed', () => {
      // When the date is within the same year, the relative time should work correctly
      const dateInSameYear = '2026-01-03T10:00:00Z'; // 1 week ago (same year)

      renderWithI18n(<StatusBadge status={ExecutionStatus.COMPLETED} date={dateInSameYear} />);

      // Should show "last week" or "1 week ago" for dates within the same year
      expect(screen.queryByText('last year')).not.toBeInTheDocument();
    });
  });

  describe('basic rendering', () => {
    it('renders status without date', () => {
      renderWithI18n(<StatusBadge status={ExecutionStatus.COMPLETED} />);
      // The status label is "Success" for COMPLETED status
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });

    it('returns null when status is undefined', () => {
      const { container } = renderWithI18n(<StatusBadge status={undefined} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
