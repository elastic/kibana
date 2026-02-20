/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ContentListProvider, useContentListSelection } from '@kbn/content-list-provider';
import type { FindItemsResult, FindItemsParams, ContentListItem } from '@kbn/content-list-provider';
import { SelectionBar } from './selection_bar';

const mockItems: ContentListItem[] = [
  { id: '1', title: 'Dashboard A' },
  { id: '2', title: 'Dashboard B' },
  { id: '3', title: 'Dashboard C' },
];

/**
 * Helper component that selects items before rendering the `SelectionBar`.
 * Uses the `useContentListSelection` hook to set the selection programmatically.
 */
const SelectionBarWithSetup = ({ itemsToSelect }: { itemsToSelect: ContentListItem[] }) => {
  const { setSelection, selectedCount } = useContentListSelection();

  // Select items on first render.
  React.useEffect(() => {
    setSelection(itemsToSelect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (selectedCount === 0) {
    return null;
  }

  return <SelectionBar />;
};

describe('SelectionBar', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: mockItems,
      total: mockItems.length,
    })
  );

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems: mockFindItems }}
      >
        {children}
      </ContentListProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a delete button with item count and entity name', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SelectionBarWithSetup itemsToSelect={[mockItems[0], mockItems[1]]} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Delete 2 dashboards')).toBeInTheDocument();
    });
  });

  it('renders singular entity name for single selection', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SelectionBarWithSetup itemsToSelect={[mockItems[0]]} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Delete 1 dashboard')).toBeInTheDocument();
    });
  });

  it('renders a danger button with trash icon', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SelectionBarWithSetup itemsToSelect={[mockItems[0]]} />
      </Wrapper>
    );

    await waitFor(() => {
      const button = screen.getByTestId('contentListSelectionBar-deleteButton');
      expect(button).toBeInTheDocument();
      // EUI uses Emotion CSS-in-JS; check for `danger` in the class string.
      expect(button.className).toContain('danger');
    });
  });

  it('returns null when no items are selected', () => {
    const Wrapper = createWrapper();
    const { container } = render(
      <Wrapper>
        <SelectionBar />
      </Wrapper>
    );

    expect(container.innerHTML).toBe('');
  });

  it('has the correct test subject on the button', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SelectionBarWithSetup itemsToSelect={[mockItems[0]]} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('contentListSelectionBar-deleteButton')).toBeInTheDocument();
    });
  });

  it('clears the selection when the delete button is clicked', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <SelectionBarWithSetup itemsToSelect={[mockItems[0], mockItems[1]]} />
      </Wrapper>
    );

    // Wait for the button to appear.
    await waitFor(() => {
      expect(screen.getByTestId('contentListSelectionBar-deleteButton')).toBeInTheDocument();
    });

    // Click the delete button.
    fireEvent.click(screen.getByTestId('contentListSelectionBar-deleteButton'));

    // The selection is cleared, so `SelectionBarWithSetup` renders null.
    await waitFor(() => {
      expect(screen.queryByTestId('contentListSelectionBar-deleteButton')).not.toBeInTheDocument();
    });
  });
});
