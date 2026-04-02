/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  ContentListProvider,
  useUserProfileStoreContext,
  useContentListSearch,
  type FindItemsParams,
  type FindItemsResult,
} from '@kbn/content-list-provider';
import { CreatedByCell } from './created_by_cell';

const mockUsers = [
  {
    uid: 'u_jane',
    user: { username: 'jane', email: 'jane@example.com', full_name: 'Jane Example' },
    email: 'jane@example.com',
    fullName: 'Jane Example',
  },
];

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const QueryProbe = () => {
  const { queryText } = useContentListSearch();
  return <span data-test-subj="query-probe">{queryText}</span>;
};

/**
 * Helper component that seeds the user profile store on mount,
 * so that profile resolution works synchronously in tests.
 */
const StoreSeeder = ({ children, uids }: { children: React.ReactNode; uids: string[] }) => {
  const userProfileStore = useUserProfileStoreContext();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    userProfileStore?.ensureLoaded(uids).then(() => setReady(true));
  }, [userProfileStore, uids]);

  if (!ready) {
    return null;
  }
  return <>{children}</>;
};

const createWrapper =
  (users = mockUsers) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems: mockFindItems }}
        services={{
          userProfiles: {
            bulkResolve: async (uids) => users.filter((u) => uids.includes(u.uid)),
          },
        }}
      >
        <StoreSeeder uids={users.map((u) => u.uid)}>
          {children}
          <QueryProbe />
        </StoreSeeder>
      </ContentListProvider>
    );

describe('CreatedByCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a fallback dash when the user cannot be resolved', async () => {
    await act(async () => {
      render(<CreatedByCell createdBy="missing-user" />, {
        wrapper: createWrapper(),
      });
    });

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders a clickable avatar for a known user', async () => {
    await act(async () => {
      render(<CreatedByCell createdBy="u_jane" />, {
        wrapper: createWrapper(),
      });
    });

    expect(screen.getByTestId('content-list-createdBy-avatar')).toHaveAttribute(
      'aria-label',
      'Filter by creator: Jane Example'
    );
  });

  it('adds an include filter on click', async () => {
    await act(async () => {
      render(<CreatedByCell createdBy="u_jane" />, {
        wrapper: createWrapper(),
      });
    });

    fireEvent.click(screen.getByTestId('content-list-createdBy-avatar'));

    expect(screen.getByTestId('query-probe')).toHaveTextContent('createdBy:("jane@example.com")');
  });

  it('adds an exclude filter when ctrl-clicked', async () => {
    await act(async () => {
      render(<CreatedByCell createdBy="u_jane" />, {
        wrapper: createWrapper(),
      });
    });

    fireEvent.click(screen.getByTestId('content-list-createdBy-avatar'), { ctrlKey: true });

    expect(screen.getByTestId('query-probe')).toHaveTextContent('-createdBy:("jane@example.com")');
  });

  it('handles keyboard activation', async () => {
    await act(async () => {
      render(<CreatedByCell createdBy="u_jane" />, {
        wrapper: createWrapper(),
      });
    });

    fireEvent.keyDown(screen.getByTestId('content-list-createdBy-avatar'), {
      key: 'Enter',
    });

    expect(screen.getByTestId('query-probe')).toHaveTextContent('createdBy:("jane@example.com")');
  });
});
