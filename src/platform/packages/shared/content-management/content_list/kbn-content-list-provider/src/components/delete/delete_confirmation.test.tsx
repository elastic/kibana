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
import { DeleteConfirmationModal } from './delete_confirmation';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const mockOnDelete = jest.fn(async () => {});

const createWrapper =
  (options?: { onDelete?: typeof mockOnDelete }) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems: mockFindItems }}
        item={{ onDelete: options?.onDelete ?? mockOnDelete }}
      >
        {children}
      </ContentListProvider>
    );

const defaultItems = [{ id: '1', title: 'Item 1' }];

describe('DeleteConfirmationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the confirmation modal', () => {
      render(<DeleteConfirmationModal items={defaultItems} onClose={jest.fn()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByTestId('contentListDeleteConfirmation')).toBeInTheDocument();
    });

    it('uses singular entity label for single item', () => {
      render(<DeleteConfirmationModal items={defaultItems} onClose={jest.fn()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/Delete 1 dashboard\?/)).toBeInTheDocument();
    });

    it('uses plural entity label for multiple items', () => {
      const items = [
        { id: '1', title: 'Item 1' },
        { id: '2', title: 'Item 2' },
        { id: '3', title: 'Item 3' },
      ];
      render(<DeleteConfirmationModal items={items} onClose={jest.fn()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/Delete 3 dashboards\?/)).toBeInTheDocument();
    });

    it('always uses plural entity name in body text', () => {
      render(<DeleteConfirmationModal items={defaultItems} onClose={jest.fn()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/You can't recover deleted dashboards\./)).toBeInTheDocument();
    });

    it('focuses the cancel button by default', async () => {
      render(<DeleteConfirmationModal items={defaultItems} onClose={jest.fn()} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByTestId('confirmModalCancelButton')).toHaveFocus();
      });
    });
  });

  describe('cancel', () => {
    it('calls `onClose` when cancel button is clicked', async () => {
      const onClose = jest.fn();
      render(<DeleteConfirmationModal items={defaultItems} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      await userEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirm', () => {
    it('calls `onDelete` with the items and then `onClose` on success', async () => {
      const onClose = jest.fn();
      render(<DeleteConfirmationModal items={defaultItems} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(defaultItems);
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('shows loading state while deleting', async () => {
      let resolveDelete: () => void;
      const slowDelete = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveDelete = resolve;
          })
      );

      render(<DeleteConfirmationModal items={defaultItems} onClose={jest.fn()} />, {
        wrapper: createWrapper({ onDelete: slowDelete }),
      });

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByText('Deleting')).toBeInTheDocument();
      });

      resolveDelete!();
    });

    it('shows error and keeps modal open on failure', async () => {
      const failingDelete = jest.fn(async () => {
        throw new Error('Network failure');
      });
      const onClose = jest.fn();

      render(<DeleteConfirmationModal items={defaultItems} onClose={onClose} />, {
        wrapper: createWrapper({ onDelete: failingDelete }),
      });

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByTestId('contentListDeleteError')).toBeInTheDocument();
        expect(screen.getByText('Network failure')).toBeInTheDocument();
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('handles non-Error thrown values with an entity-aware fallback message', async () => {
      const failingDelete = jest.fn(async () => {
        throw 'string error'; // eslint-disable-line no-throw-literal
      });

      render(<DeleteConfirmationModal items={defaultItems} onClose={jest.fn()} />, {
        wrapper: createWrapper({ onDelete: failingDelete }),
      });

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(
          screen.getByText(
            'The dashboards could not be deleted. Check the Kibana server logs or try again.'
          )
        ).toBeInTheDocument();
      });
    });
  });
});
