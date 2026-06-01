/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useIsWithinMaxBreakpoint } from '@elastic/eui';
import { TransactionsTable } from '.';
import type { TransactionGroup } from './types';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useIsWithinMaxBreakpoint: jest.fn(),
}));

const items: TransactionGroup[] = [
  {
    name: 'GET /api',
    latency: { value: 100000 },
    throughput: { value: 10 },
    errorRate: { value: 0.01 },
  },
];

describe('TransactionsTable', () => {
  beforeEach(() => {
    (useIsWithinMaxBreakpoint as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the loading message when isLoading is true', () => {
    render(<TransactionsTable items={[]} isLoading={true} maxCountExceeded={false} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the no-results message when items are empty and not loading', () => {
    render(<TransactionsTable items={[]} isLoading={false} maxCountExceeded={false} />);
    expect(screen.getByText('No transactions found')).toBeInTheDocument();
  });

  it('shows the cardinality warning when maxCountExceeded and showMaxTransactionGroupsExceededWarning are true', () => {
    render(
      <TransactionsTable
        items={items}
        isLoading={false}
        maxCountExceeded={true}
        showMaxTransactionGroupsExceededWarning={true}
      />
    );
    expect(
      screen.getByText(/Number of transaction groups exceed the allowed maximum/)
    ).toBeInTheDocument();
  });

  it('does not show the cardinality warning when maxCountExceeded is false', () => {
    render(
      <TransactionsTable
        items={items}
        isLoading={false}
        maxCountExceeded={false}
        showMaxTransactionGroupsExceededWarning={true}
      />
    );
    expect(
      screen.queryByText(/Number of transaction groups exceed the allowed maximum/)
    ).not.toBeInTheDocument();
  });

  describe('search behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calls onSearchQueryChange after debounce when the new query does not include the previous one', () => {
      const onSearchQueryChange = jest.fn();
      render(
        <TransactionsTable
          items={items}
          isLoading={false}
          maxCountExceeded={false}
          onSearchQueryChange={onSearchQueryChange}
        />
      );

      const searchInput = screen.getByRole('searchbox');

      // Establish 'banana' as current query — extends '' so no server call
      fireEvent.change(searchInput, { target: { value: 'banana' } });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(onSearchQueryChange).not.toHaveBeenCalled();

      // Change to 'cherry' — does not include 'banana', triggers server fetch
      fireEvent.change(searchInput, { target: { value: 'cherry' } });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(onSearchQueryChange).toHaveBeenCalledWith('cherry');
    });

    it('does not call onSearchQueryChange when the new query extends the previous one', () => {
      const onSearchQueryChange = jest.fn();
      render(
        <TransactionsTable
          items={items}
          isLoading={false}
          maxCountExceeded={false}
          onSearchQueryChange={onSearchQueryChange}
        />
      );

      const searchInput = screen.getByRole('searchbox');

      fireEvent.change(searchInput, { target: { value: 'ban' } });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      fireEvent.change(searchInput, { target: { value: 'banana' } });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onSearchQueryChange).not.toHaveBeenCalled();
    });

    it('calls onSearchQueryChange when maxCountExceeded is true even if query extends the previous one', () => {
      const onSearchQueryChange = jest.fn();
      render(
        <TransactionsTable
          items={items}
          isLoading={false}
          maxCountExceeded={true}
          onSearchQueryChange={onSearchQueryChange}
        />
      );

      const searchInput = screen.getByRole('searchbox');

      fireEvent.change(searchInput, { target: { value: 'ban' } });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      fireEvent.change(searchInput, { target: { value: 'banana' } });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onSearchQueryChange).toHaveBeenCalledTimes(2);
    });
  });
});
