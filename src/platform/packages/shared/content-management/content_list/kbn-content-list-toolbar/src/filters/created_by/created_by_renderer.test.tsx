/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Query } from '@elastic/eui';
import type { UserProfile } from '@kbn/user-profile-components';
import {
  ContentListProvider,
  contentListQueryClient,
  type FindItemsParams,
  type FindItemsResult,
  type UserProfileService,
} from '@kbn/content-list-provider';
import { CreatedByRenderer } from './created_by_renderer';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockProfiles: UserProfile[] = [
  {
    uid: 'user-1',
    enabled: true,
    user: { username: 'jdoe', full_name: 'Jane Doe', email: 'jdoe@elastic.co' },
    data: {},
  },
  {
    uid: 'user-2',
    enabled: true,
    user: { username: 'bsmith', full_name: 'Bob Smith', email: 'bsmith@elastic.co' },
    data: {},
  },
];

const mockUserProfileService: UserProfileService = {
  getUserProfile: jest.fn(async (uid: string) => {
    const found = mockProfiles.find((p) => p.uid === uid);
    return found ?? { uid, enabled: true, user: { username: uid }, data: {} };
  }),
  bulkGetUserProfiles: jest.fn(async (uids: string[]) => {
    return uids.map((uid) => {
      const found = mockProfiles.find((p) => p.uid === uid);
      return found ?? { uid, enabled: true, user: { username: uid }, data: {} };
    });
  }),
};

/** Items with a variety of `createdBy` and `managed` states. */
const mockItems = [
  { id: '1', title: 'Item 1', createdBy: 'user-1' },
  { id: '2', title: 'Item 2', createdBy: 'user-2' },
  { id: '3', title: 'Item 3', managed: true },
  { id: '4', title: 'Item 4' }, // no creator
];

const createMockFindItems = (items = mockItems) =>
  jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items,
      total: items.length,
    })
  );

/** Wraps children in a `ContentListProvider` with user profile service. */
const createWrapper =
  (findItems = createMockFindItems()) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems }}
        services={{ userProfile: mockUserProfileService }}
      >
        {children}
      </ContentListProvider>
    );

/** Dummy `query` prop required by `CreatedByRendererProps`. */
const dummyQuery = {} as Query;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CreatedByRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the singleton query client cache to prevent data leaking between tests.
    contentListQueryClient.clear();
  });

  it('renders the "Created by" filter button', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <CreatedByRenderer query={dummyQuery} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /created by/i })).toBeInTheDocument();
    });
  });

  it('applies the default data-test-subj', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <CreatedByRenderer query={dummyQuery} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('contentListCreatedByFilter')).toBeInTheDocument();
    });
  });

  it('applies a custom data-test-subj', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <CreatedByRenderer query={dummyQuery} data-test-subj="my-filter" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('my-filter')).toBeInTheDocument();
    });
  });

  it('opens the popover when the button is clicked', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <CreatedByRenderer query={dummyQuery} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /created by/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /created by/i }));

    // The popover title should appear.
    await waitFor(() => {
      const matches = screen.getAllByText('Created by');
      // Button label + popover title.
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows user profile names once popover is open', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <CreatedByRenderer query={dummyQuery} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /created by/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /created by/i }));

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  it('shows "Managed" entry when managed items exist', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <CreatedByRenderer query={dummyQuery} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /created by/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /created by/i }));

    await waitFor(() => {
      expect(screen.getByText('Managed')).toBeInTheDocument();
    });
  });

  it('shows "No creator" entry when items without creators exist', async () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <CreatedByRenderer query={dummyQuery} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /created by/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /created by/i }));

    await waitFor(() => {
      expect(screen.getByText('No creator')).toBeInTheDocument();
    });
  });

  it('does not show "Managed" when no managed items exist', async () => {
    const items = [
      { id: '1', title: 'Item 1', createdBy: 'user-1' },
      { id: '2', title: 'Item 2', createdBy: 'user-2' },
    ];
    const Wrapper = createWrapper(createMockFindItems(items));
    render(
      <Wrapper>
        <CreatedByRenderer query={dummyQuery} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /created by/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /created by/i }));

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    expect(screen.queryByText('Managed')).not.toBeInTheDocument();
  });
});
