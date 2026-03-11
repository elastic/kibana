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
import {
  ContentListProvider,
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import { EmptyState } from './empty_state';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ContentListProvider
    id="test-list"
    labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
    dataSource={{ findItems: mockFindItems }}
  >
    {children}
  </ContentListProvider>
);

describe('EmptyState', () => {
  it('renders with the data-test-subj attribute', () => {
    render(
      <Wrapper>
        <EmptyState />
      </Wrapper>
    );

    expect(screen.getByTestId('content-list-table-empty-state')).toBeInTheDocument();
  });

  it('renders default title using entityPlural from provider', () => {
    render(
      <Wrapper>
        <EmptyState />
      </Wrapper>
    );

    expect(screen.getByText('No dashboards found')).toBeInTheDocument();
  });

  it('renders default body using entityPlural from provider', () => {
    render(
      <Wrapper>
        <EmptyState />
      </Wrapper>
    );

    expect(screen.getByText('There are no dashboards to display.')).toBeInTheDocument();
  });

  it('renders custom title when provided', () => {
    render(
      <Wrapper>
        <EmptyState title="Nothing here" />
      </Wrapper>
    );

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    // Default title should not appear.
    expect(screen.queryByText('No dashboards found')).not.toBeInTheDocument();
  });

  it('renders custom body when provided', () => {
    render(
      <Wrapper>
        <EmptyState body="Try a different search." />
      </Wrapper>
    );

    expect(screen.getByText('Try a different search.')).toBeInTheDocument();
    expect(screen.queryByText('There are no dashboards to display.')).not.toBeInTheDocument();
  });

  it('renders both custom title and body', () => {
    render(
      <Wrapper>
        <EmptyState title="No results" body="Adjust your filters." />
      </Wrapper>
    );

    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Adjust your filters.')).toBeInTheDocument();
  });
});
