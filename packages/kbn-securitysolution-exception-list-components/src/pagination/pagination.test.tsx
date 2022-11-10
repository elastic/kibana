/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { Pagination } from './pagination';

describe('Pagination', () => {
  it('it invokes "onPaginationChange" when per page item is clicked', () => {
    const mockOnPaginationChange = jest.fn();
    const wrapper = render(
      <Pagination
        pagination={{
          pageIndex: 0,
          pageSize: 50,
          totalItemCount: 1,
          pageSizeOptions: [20, 50, 100],
        }}
        onPaginationChange={mockOnPaginationChange}
      />
    );

    fireEvent.click(wrapper.getByTestId('tablePaginationPopoverButton'));
    fireEvent.click(wrapper.getByTestId('tablePagination-50-rows'));

    expect(mockOnPaginationChange).toHaveBeenCalledWith({
      pagination: { pageIndex: 0, pageSize: 50, totalItemCount: 1 },
    });
  });

  it('it invokes "onPaginationChange" when next clicked', () => {
    const mockOnPaginationChange = jest.fn();
    const wrapper = render(
      <Pagination
        pagination={{
          pageIndex: 0,
          pageSize: 5,
          totalItemCount: 160,
          pageSizeOptions: [5, 20, 50, 100],
        }}
        onPaginationChange={mockOnPaginationChange}
      />
    );

    fireEvent.click(wrapper.getByTestId('pagination-button-next'));

    expect(mockOnPaginationChange).toHaveBeenCalledWith({
      pagination: { pageIndex: 1, pageSize: 5, totalItemCount: 160 },
    });
  });

  it('it invokes "onPaginationChange" when page clicked', () => {
    const mockOnPaginationChange = jest.fn();
    const wrapper = render(
      <Pagination
        pagination={{
          pageIndex: 0,
          pageSize: 50,
          totalItemCount: 160,
          pageSizeOptions: [20, 50, 100],
        }}
        onPaginationChange={mockOnPaginationChange}
      />
    );

    fireEvent.click(wrapper.getByTestId('pagination-button-2'));

    expect(mockOnPaginationChange).toHaveBeenCalledWith({
      pagination: { pageIndex: 2, pageSize: 50, totalItemCount: 160 },
    });
  });
});
