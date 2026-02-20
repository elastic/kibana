/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PaginationComponent, type PaginationComponentProps } from './pagination_component';

const defaultProps: PaginationComponentProps = {
  pageIndex: 0,
  pageSize: 20,
  totalItems: 100,
  pageSizeOptions: [10, 20, 50],
  onPageChange: jest.fn(),
  onPageSizeChange: jest.fn(),
};

describe('PaginationComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pagination controls when there are items', () => {
    render(<PaginationComponent {...defaultProps} />);

    expect(screen.getByTestId('contentListFooter-pagination')).toBeInTheDocument();
  });

  it('returns null when totalItems is 0', () => {
    const { container } = render(<PaginationComponent {...defaultProps} totalItems={0} />);

    expect(container.firstChild).toBeNull();
  });

  it('applies a custom data-test-subj', () => {
    render(<PaginationComponent {...defaultProps} data-test-subj="custom-pagination" />);

    expect(screen.getByTestId('custom-pagination')).toBeInTheDocument();
  });

  it('calculates page count correctly', () => {
    // 100 items / 20 per page = 5 pages.
    const { rerender } = render(<PaginationComponent {...defaultProps} />);

    // `EuiTablePagination` renders page buttons with "Page X of Y" labels.
    expect(screen.getByRole('button', { name: /Page 5 of 5/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Page 6/ })).not.toBeInTheDocument();

    // 50 items / 10 per page = 5 pages.
    rerender(<PaginationComponent {...defaultProps} totalItems={50} pageSize={10} />);
    expect(screen.getByRole('button', { name: /Page 5 of 5/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Page 6/ })).not.toBeInTheDocument();

    // 25 items / 10 per page = 3 pages.
    rerender(<PaginationComponent {...defaultProps} totalItems={25} pageSize={10} />);
    expect(screen.getByRole('button', { name: /Page 3 of 3/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Page 4/ })).not.toBeInTheDocument();
  });
});
