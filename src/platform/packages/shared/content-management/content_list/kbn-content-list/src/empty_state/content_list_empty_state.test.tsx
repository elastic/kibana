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
import { ContentListProvider } from '@kbn/content-list-provider';
import type { ContentListItem, FindItemsParams, FindItemsResult } from '@kbn/content-list-provider';
import { ContentListEmptyState } from './content_list_empty_state';

let providerIdCounter = 0;
const nextProviderId = () => `content-list-empty-state-test-${++providerIdCounter}`;

const renderWithProvider = (
  ui: React.ReactElement,
  {
    findItems = async () => ({ items: [] as ContentListItem[], total: 0 }),
    labels = { entity: 'item', entityPlural: 'items' },
  }: {
    findItems?: (params: FindItemsParams) => Promise<FindItemsResult>;
    labels?: { entity: string; entityPlural: string };
  } = {}
) =>
  render(
    <ContentListProvider id={nextProviderId()} labels={labels} dataSource={{ findItems }}>
      {ui}
    </ContentListProvider>
  );

describe('ContentListEmptyState', () => {
  it('renders provider-derived default title and body in the empty phase', async () => {
    renderWithProvider(<ContentListEmptyState data-test-subj="empty-state" />);

    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());

    expect(screen.getByText('No items yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first item to get started.')).toBeInTheDocument();
  });

  it('returns null outside the empty phase', async () => {
    renderWithProvider(<ContentListEmptyState data-test-subj="empty-state" />, {
      findItems: async () => ({
        items: [{ id: '1', title: 'Item 1', type: 'dashboard' }],
        total: 1,
      }),
    });

    await waitFor(() => expect(screen.queryByTestId('empty-state')).toBeNull());
  });

  it('renders a primary action when configured', async () => {
    const onClick = jest.fn();

    renderWithProvider(
      <ContentListEmptyState
        data-test-subj="empty-state"
        primaryAction={{ label: 'Create item', onClick }}
      />
    );

    const button = await screen.findByRole('button', { name: 'Create item' });
    button.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders rich custom body content without paragraph wrapping', async () => {
    renderWithProvider(
      <ContentListEmptyState
        data-test-subj="empty-state"
        body={[
          <p key="one">First paragraph</p>,
          <ul key="two">
            <li>Checklist item</li>
          </ul>,
        ]}
      />
    );

    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());

    expect(screen.getByText('First paragraph')).toBeInTheDocument();
    expect(screen.getByText('Checklist item')).toBeInTheDocument();
  });
});
