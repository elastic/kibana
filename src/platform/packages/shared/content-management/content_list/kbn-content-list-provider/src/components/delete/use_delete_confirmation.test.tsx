/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ContentListProvider } from '../../context';
import type { FindItemsResult, FindItemsParams } from '../../datasource';
import { useDeleteConfirmation } from './use_delete_confirmation';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const mockOnDelete = jest.fn(async () => {});

const createWrapper =
  () =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems: mockFindItems }}
        item={{ onDelete: mockOnDelete }}
      >
        {children}
      </ContentListProvider>
    );

const testItems = [{ id: '1', title: 'Item 1' }];

const TestHarness = ({ onClose }: { onClose?: () => void }) => {
  const { requestDelete, deleteModal } = useDeleteConfirmation({ onClose });
  return (
    <>
      <button onClick={() => requestDelete(testItems)}>trigger</button>
      {deleteModal}
    </>
  );
};

describe('useDeleteConfirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns `null` for `deleteModal` initially', () => {
    render(<TestHarness />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('contentListDeleteConfirmation')).not.toBeInTheDocument();
  });

  it('opens the modal after `requestDelete` is called', async () => {
    render(<TestHarness />, { wrapper: createWrapper() });

    await userEvent.click(screen.getByText('trigger'));

    expect(screen.getByTestId('contentListDeleteConfirmation')).toBeInTheDocument();
    expect(screen.getByText(/Delete 1 dashboard\?/)).toBeInTheDocument();
  });

  it('closes the modal when the user cancels', async () => {
    render(<TestHarness />, { wrapper: createWrapper() });

    await userEvent.click(screen.getByText('trigger'));
    await userEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('contentListDeleteConfirmation')).not.toBeInTheDocument();
    });
  });

  it('calls the `onClose` callback when the modal closes', async () => {
    const onClose = jest.fn();
    render(<TestHarness onClose={onClose} />, { wrapper: createWrapper() });

    await userEvent.click(screen.getByText('trigger'));
    await userEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('closes the modal after a successful delete', async () => {
    const onClose = jest.fn();
    render(<TestHarness onClose={onClose} />, { wrapper: createWrapper() });

    await userEvent.click(screen.getByText('trigger'));
    await userEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith(testItems);
      expect(screen.queryByTestId('contentListDeleteConfirmation')).not.toBeInTheDocument();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
