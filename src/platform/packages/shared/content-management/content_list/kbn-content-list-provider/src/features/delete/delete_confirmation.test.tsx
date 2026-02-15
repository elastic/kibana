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
import { ContentListProvider } from '../../context';
import type { FindItemsResult, FindItemsParams } from '../../datasource';
import { useContentListState } from '../../state/use_content_list_state';
import { CONTENT_LIST_ACTIONS } from '../../state/types';

/**
 * Helper component that dispatches `REQUEST_DELETE` to trigger the provider's
 * auto-rendered `LazyDeleteConfirmation`.
 */
const TriggerDelete = ({ itemCount = 1 }: { itemCount?: number }) => {
  const { dispatch } = useContentListState();

  React.useEffect(() => {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      id: String(i + 1),
      title: `Item ${i + 1}`,
    }));
    dispatch({ type: CONTENT_LIST_ACTIONS.REQUEST_DELETE, payload: { items } });
  }, [dispatch, itemCount]);

  return null;
};

describe('DeleteConfirmation', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: [],
      total: 0,
    })
  );

  const mockOnDelete = jest.fn(async () => {});

  const renderWithProvider = (options?: {
    itemCount?: number;
    entity?: string;
    entityPlural?: string;
    triggerDelete?: boolean;
  }) => {
    const {
      itemCount = 1,
      entity = 'dashboard',
      entityPlural = 'dashboards',
      triggerDelete = true,
    } = options ?? {};

    return render(
      <ContentListProvider
        id="test-list"
        labels={{ entity, entityPlural }}
        dataSource={{ findItems: mockFindItems }}
        item={{ onDelete: mockOnDelete }}
      >
        {triggerDelete && <TriggerDelete itemCount={itemCount} />}
      </ContentListProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when deleteRequest is null', () => {
      renderWithProvider({ triggerDelete: false });

      expect(screen.queryByTestId('contentListDeleteConfirmation')).not.toBeInTheDocument();
    });

    it('renders confirmation modal when deleteRequest is set', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('contentListDeleteConfirmation')).toBeInTheDocument();
      });
    });

    it('uses singular entity label for single item', async () => {
      renderWithProvider({ itemCount: 1 });

      await waitFor(() => {
        expect(screen.getByText(/Delete 1 dashboard\?/)).toBeInTheDocument();
      });
    });

    it('uses plural entity label for multiple items', async () => {
      renderWithProvider({ itemCount: 3 });

      await waitFor(() => {
        expect(screen.getByText(/Delete 3 dashboards\?/)).toBeInTheDocument();
      });
    });

    it('always uses plural entity name in body text', async () => {
      renderWithProvider({ itemCount: 1 });

      await waitFor(() => {
        expect(screen.getByText(/You can't recover deleted dashboards\./)).toBeInTheDocument();
      });
    });

    it('focuses the cancel button by default', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('contentListDeleteConfirmation')).toBeInTheDocument();
      });

      // EuiConfirmModal with `defaultFocusedButton="cancel"` focuses the cancel button.
      expect(screen.getByTestId('confirmModalCancelButton')).toHaveFocus();
    });
  });

  describe('cancel', () => {
    it('dismisses the modal on cancel', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('contentListDeleteConfirmation')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('contentListDeleteConfirmation')).not.toBeInTheDocument();
      });
    });
  });

  describe('confirm', () => {
    it('calls onDelete with the items from deleteRequest', async () => {
      renderWithProvider({ itemCount: 2 });

      await waitFor(() => {
        expect(screen.getByTestId('contentListDeleteConfirmation')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith([
          { id: '1', title: 'Item 1' },
          { id: '2', title: 'Item 2' },
        ]);
      });
    });

    it('dismisses the modal after successful delete', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('contentListDeleteConfirmation')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.queryByTestId('contentListDeleteConfirmation')).not.toBeInTheDocument();
      });
    });

    it('dismisses the modal on delete failure', async () => {
      mockOnDelete.mockRejectedValueOnce(new Error('Delete failed'));

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('contentListDeleteConfirmation')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.queryByTestId('contentListDeleteConfirmation')).not.toBeInTheDocument();
      });
    });

    it('ignores additional clicks while delete is in progress', async () => {
      let resolveDelete: () => void;
      mockOnDelete.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveDelete = resolve;
          })
      );

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('contentListDeleteConfirmation')).toBeInTheDocument();
      });

      // First click starts the delete.
      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByText('Deleting')).toBeInTheDocument();
      });

      // A second click should be a no-op; `onDelete` is called only once.
      await userEvent.click(screen.getByText('Deleting'));
      expect(mockOnDelete).toHaveBeenCalledTimes(1);

      // Resolve and let the modal close.
      resolveDelete!();

      await waitFor(() => {
        expect(screen.queryByTestId('contentListDeleteConfirmation')).not.toBeInTheDocument();
      });
    });
  });
});
