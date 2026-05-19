/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ContentListProvider } from '../../context';
import type { FindItemsResult, FindItemsParams } from '../../datasource';
import type { ContentListItem } from '../../item';
import { DeleteConfirmationModal } from './delete_confirmation';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const mockOnDelete = jest.fn(async () => {});

const createWrapper = (options?: {
  onDelete?: typeof mockOnDelete;
  getDeleteRestriction?: (item: ContentListItem) => string | undefined;
}) => {
  const item = {
    actions: {
      delete: {
        onBulkAction: options?.onDelete ?? mockOnDelete,
        ...(options?.getDeleteRestriction && { restriction: options.getDeleteRestriction }),
      },
    },
  };
  return ({ children }: { children: React.ReactNode }) => (
    <ContentListProvider
      id="test-list"
      labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
      dataSource={{ findItems: mockFindItems }}
      item={item}
    >
      {children}
    </ContentListProvider>
  );
};

const defaultItems: ContentListItem[] = [{ id: '1', title: 'Item 1' }];

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
      const items: ContentListItem[] = [
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

  describe('partition by delete restriction', () => {
    const sampleItems: ContentListItem[] = [
      { id: '1', title: 'Free 1', managed: false },
      { id: '2', title: 'Managed 1', managed: true },
      { id: '3', title: 'Free 2', managed: false },
      { id: '4', title: 'Managed 2', managed: true },
    ];

    const restrictManaged = (item: ContentListItem) =>
      item.managed ? 'Managed dashboards cannot be deleted.' : undefined;

    it('uses `permitted` count in the title when some items are skipped', () => {
      render(<DeleteConfirmationModal items={sampleItems} onClose={jest.fn()} />, {
        wrapper: createWrapper({ getDeleteRestriction: restrictManaged }),
      });

      expect(screen.getByText(/Delete 2 dashboards\?/)).toBeInTheDocument();
    });

    it('renders a callout listing the skipped items and their reason', () => {
      render(<DeleteConfirmationModal items={sampleItems} onClose={jest.fn()} />, {
        wrapper: createWrapper({ getDeleteRestriction: restrictManaged }),
      });

      const callout = screen.getByTestId('contentListDeleteConfirmation-skippedCallout');
      expect(
        within(callout).getByText("2 dashboards can't be deleted and will be skipped")
      ).toBeInTheDocument();

      const list = within(callout).getByTestId('contentListDeleteConfirmation-skippedList');
      expect(within(list).getByText('Managed dashboards cannot be deleted.')).toBeInTheDocument();
      expect(within(list).getByText('Managed 1')).toBeInTheDocument();
      expect(within(list).getByText('Managed 2')).toBeInTheDocument();
    });

    it('itemises per-row when skipped reasons differ', () => {
      const restrictMixed = (item: ContentListItem) => {
        if (item.id === '2') {
          return 'Managed';
        }
        if (item.id === '4') {
          return 'In use';
        }
        return undefined;
      };

      render(<DeleteConfirmationModal items={sampleItems} onClose={jest.fn()} />, {
        wrapper: createWrapper({ getDeleteRestriction: restrictMixed }),
      });

      const list = screen.getByTestId('contentListDeleteConfirmation-skippedList');
      // Each itemised line includes both title and reason text.
      expect(list).toHaveTextContent('Managed 1 - Managed');
      expect(list).toHaveTextContent('Managed 2 - In use');
    });

    it('passes only `permitted` items to `onDelete` on confirm', async () => {
      render(<DeleteConfirmationModal items={sampleItems} onClose={jest.fn()} />, {
        wrapper: createWrapper({ getDeleteRestriction: restrictManaged }),
      });

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledTimes(1);
      });
      expect(mockOnDelete).toHaveBeenCalledWith([sampleItems[0], sampleItems[2]]);
    });

    it('flips to informational mode when every selected item is restricted', () => {
      const allManaged: ContentListItem[] = [
        { id: '2', title: 'Managed 1', managed: true },
        { id: '4', title: 'Managed 2', managed: true },
      ];

      render(<DeleteConfirmationModal items={allManaged} onClose={jest.fn()} />, {
        wrapper: createWrapper({ getDeleteRestriction: restrictManaged }),
      });

      expect(screen.getByText(/2 dashboards can't be deleted/)).toBeInTheDocument();
      expect(screen.getByTestId('contentListDeleteConfirmation-closeButton')).toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('closes via the informational `Close` button without invoking `onDelete`', async () => {
      const onClose = jest.fn();
      const allManaged: ContentListItem[] = [{ id: '2', title: 'Managed 1', managed: true }];

      render(<DeleteConfirmationModal items={allManaged} onClose={onClose} />, {
        wrapper: createWrapper({ getDeleteRestriction: restrictManaged }),
      });

      await userEvent.click(screen.getByTestId('contentListDeleteConfirmation-closeButton'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('renders without a skipped callout when no items are restricted', () => {
      render(<DeleteConfirmationModal items={sampleItems} onClose={jest.fn()} />, {
        wrapper: createWrapper({ getDeleteRestriction: () => undefined }),
      });

      expect(
        screen.queryByTestId('contentListDeleteConfirmation-skippedCallout')
      ).not.toBeInTheDocument();
      expect(screen.getByText(/Delete 4 dashboards\?/)).toBeInTheDocument();
    });
  });
});
