/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Pagination } from './pagination';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { METRICS_GRID_PAGINATION_DATA_TEST_SUBJ } from '../common/constants';

describe('Pagination', () => {
  it('renders EuiPagination when totalPages > 1', () => {
    const onPageChange = jest.fn();
    const { getByTestId } = render(
      <Pagination totalPages={3} currentPage={0} onPageChange={onPageChange} />,
      { wrapper: IntlProvider }
    );

    expect(getByTestId(METRICS_GRID_PAGINATION_DATA_TEST_SUBJ)).toBeInTheDocument();
  });

  it('does not render when totalPages <= 1', () => {
    const onPageChange = jest.fn();
    const { queryByTestId: queryByTestId1 } = render(
      <Pagination totalPages={1} currentPage={0} onPageChange={onPageChange} />,
      { wrapper: IntlProvider }
    );

    expect(queryByTestId1(METRICS_GRID_PAGINATION_DATA_TEST_SUBJ)).not.toBeInTheDocument();

    const { queryByTestId: queryByTestId0 } = render(
      <Pagination totalPages={0} currentPage={0} onPageChange={onPageChange} />,
      { wrapper: IntlProvider }
    );

    expect(queryByTestId0(METRICS_GRID_PAGINATION_DATA_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('calls onPageChange to correct out-of-range page on mount', () => {
    const onPageChange = jest.fn();
    render(<Pagination totalPages={3} currentPage={5} onPageChange={onPageChange} />, {
      wrapper: IntlProvider,
    });

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange to correct out-of-range page when totalPages changes', () => {
    const onPageChange = jest.fn();
    const { rerender } = render(
      <Pagination totalPages={5} currentPage={4} onPageChange={onPageChange} />,
      { wrapper: IntlProvider }
    );

    expect(onPageChange).not.toHaveBeenCalled();

    rerender(<Pagination totalPages={3} currentPage={4} onPageChange={onPageChange} />);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('does not call onPageChange when currentPage is within range', () => {
    const onPageChange = jest.fn();
    render(<Pagination totalPages={3} currentPage={1} onPageChange={onPageChange} />, {
      wrapper: IntlProvider,
    });

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('does not call onPageChange when totalPages is 0', () => {
    const onPageChange = jest.fn();
    render(<Pagination totalPages={0} currentPage={5} onPageChange={onPageChange} />, {
      wrapper: IntlProvider,
    });

    expect(onPageChange).not.toHaveBeenCalled();
  });
});
