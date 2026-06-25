/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Query } from '@elastic/eui';
import {
  ContentListProvider,
  type FindItemsParams,
  type FindItemsResult,
  type ContentListUserProfilesServices,
  type FilterFacetConfig,
  type UserProfileEntry,
  useContentListFilters,
  useContentListSearch,
} from '@kbn/content-list-provider';
import { CreatedByFilterRenderer } from './created_by_filter_renderer';

const mockUsers: UserProfileEntry[] = [
  {
    uid: 'u_jane',
    user: { username: 'jane', email: 'jane@example.com', full_name: 'Jane Example' },
    email: 'jane@example.com',
    fullName: 'Jane Example',
  },
  {
    uid: 'u_john',
    user: { username: 'john', email: 'john@example.com', full_name: 'John Example' },
    email: 'john@example.com',
    fullName: 'John Example',
  },
];

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const mockUserProfilesService: ContentListUserProfilesServices = {
  bulkResolve: async (uids) => mockUsers.filter((u) => uids.includes(u.uid)),
};

const mockUserProfilesFacetProvider: FilterFacetConfig<UserProfileEntry> = {
  getFacets: async () =>
    mockUsers.map((u) => ({
      key: u.uid,
      label: u.fullName,
      count: u.uid === 'u_jane' ? 3 : 1,
      data: u,
    })),
};

const createWrapper = (userProfiles?: ContentListUserProfilesServices) => {
  return ({ children }: { children: React.ReactNode }) => (
    <ContentListProvider
      id="test-list"
      labels={{ entity: 'item', entityPlural: 'items' }}
      dataSource={{ findItems: mockFindItems }}
      services={userProfiles ? { userProfiles } : undefined}
      features={userProfiles ? { userProfiles: mockUserProfilesFacetProvider } : undefined}
    >
      {children}
    </ContentListProvider>
  );
};

const InteractiveCreatedByFilter = () => {
  const { queryText, setQueryFromEuiQuery } = useContentListSearch();
  const { filters } = useContentListFilters();

  return (
    <>
      <CreatedByFilterRenderer query={Query.parse(queryText)} onChange={setQueryFromEuiQuery} />
      <span data-test-subj="query-probe">{queryText}</span>
      <span data-test-subj="filters-probe">{JSON.stringify(filters.createdBy ?? null)}</span>
    </>
  );
};

describe('CreatedByFilterRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when user profiles are unavailable', () => {
    const { container } = render(<CreatedByFilterRenderer query={Query.parse('')} />, {
      wrapper: createWrapper(),
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the created by filter button and user options', async () => {
    await act(async () => {
      render(<CreatedByFilterRenderer query={Query.parse('')} />, {
        wrapper: createWrapper(mockUserProfilesService),
      });
    });

    fireEvent.click(screen.getByText('Created by'));

    expect(await screen.findByText('Jane Example')).toBeInTheDocument();
    expect(screen.getByText('John Example')).toBeInTheDocument();
    expect(screen.getByTestId('createdBy-searchbar-option-u_jane')).toBeInTheDocument();
  });

  it('calls onChange with the selected email value', async () => {
    const onChange = jest.fn();

    await act(async () => {
      render(<CreatedByFilterRenderer query={Query.parse('')} onChange={onChange} />, {
        wrapper: createWrapper(mockUserProfilesService),
      });
    });

    fireEvent.click(screen.getByText('Created by'));
    fireEvent.click(await screen.findByText('Jane Example'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].text).toContain('createdBy:("jane@example.com")');
  });

  it('resolves direct-provider facet selections to UID filters', async () => {
    await act(async () => {
      render(<InteractiveCreatedByFilter />, {
        wrapper: createWrapper(mockUserProfilesService),
      });
    });

    fireEvent.click(screen.getByText('Created by'));
    fireEvent.click(await screen.findByText('Jane Example'));

    await waitFor(() => {
      expect(screen.getByTestId('query-probe')).toHaveTextContent('createdBy:("jane@example.com")');
    });

    await waitFor(() => {
      expect(screen.getByTestId('filters-probe')).toHaveTextContent(
        '{"include":["u_jane"],"exclude":[]}'
      );
    });
  });

  it('renders counts from facets', async () => {
    await act(async () => {
      render(<CreatedByFilterRenderer query={Query.parse('')} />, {
        wrapper: createWrapper(mockUserProfilesService),
      });
    });

    fireEvent.click(screen.getByText('Created by'));

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
});
