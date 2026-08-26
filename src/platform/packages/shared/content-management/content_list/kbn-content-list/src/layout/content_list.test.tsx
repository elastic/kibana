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
import type { FindItemsParams, FindItemsResult } from '@kbn/content-list-provider';
import { contentListQueryClient } from '@kbn/content-list-provider';
import { ContentList } from './content_list';

const buildItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    title: `Item ${i}`,
    type: 'dashboard',
  }));

let providerIdCounter = 0;
const nextProviderId = () => `content-list-test-${++providerIdCounter}`;

const renderWithProvider = (
  ui: React.ReactElement,
  findItems: (params: FindItemsParams) => Promise<FindItemsResult>
) =>
  render(
    <ContentListProvider
      id={nextProviderId()}
      labels={{ entity: 'item', entityPlural: 'items' }}
      dataSource={{ findItems }}
    >
      {ui}
    </ContentListProvider>
  );

describe('ContentList', () => {
  afterEach(async () => {
    await contentListQueryClient.cancelQueries();
    contentListQueryClient.clear();
  });

  it("renders children inside a flex-column wrapper during 'populated'", async () => {
    const findItems = jest.fn(async () => ({
      items: buildItems(3),
      total: 3,
    }));

    renderWithProvider(
      <ContentList>
        <div data-test-subj="child">child content</div>
      </ContentList>,
      findItems
    );

    await waitFor(() => expect(screen.getByTestId('child')).toHaveTextContent('child content'));
    expect(screen.queryByTestId('empty')).toBeNull();
  });

  it("renders the provider-derived default empty state during 'empty'", async () => {
    const findItems = jest.fn(async () => ({ items: [], total: 0 }));

    renderWithProvider(
      <ContentList>
        <div data-test-subj="child">child content</div>
      </ContentList>,
      findItems
    );

    await waitFor(() => {
      expect(screen.getByTestId('content-list-default-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('No items yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first item to get started.')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it("renders the emptyState prop (not children) during 'empty'", async () => {
    const findItems = jest.fn(async () => ({ items: [], total: 0 }));

    renderWithProvider(
      <ContentList emptyState={<div data-test-subj="empty">nothing here</div>}>
        <div data-test-subj="child">child content</div>
      </ContentList>,
      findItems
    );

    await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument());
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('supports null emptyState to intentionally suppress the default prompt', async () => {
    const findItems = jest.fn(async () => ({ items: [], total: 0 }));

    renderWithProvider(
      <ContentList emptyState={null}>
        <div data-test-subj="child">child content</div>
      </ContentList>,
      findItems
    );

    await waitFor(() => expect(screen.queryByTestId('child')).toBeNull());
    expect(screen.getByTestId('content-list-emptyState')).toBeEmptyDOMElement();
    expect(screen.queryByTestId('content-list-default-empty-state')).toBeNull();
  });

  it("renders children (not emptyState) during 'initialLoad'", () => {
    const findItems = jest.fn(() => new Promise<FindItemsResult>(() => undefined));

    renderWithProvider(
      <ContentList emptyState={<div data-test-subj="empty">empty</div>}>
        <div data-test-subj="child">child content</div>
      </ContentList>,
      findItems
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('empty')).toBeNull();
  });
});
