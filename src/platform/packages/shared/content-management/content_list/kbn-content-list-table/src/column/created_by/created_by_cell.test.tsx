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
import type { UserProfile } from '@kbn/user-profile-components';
import {
  ContentListProvider,
  type FindItemsResult,
  type FindItemsParams,
  type ContentListItem,
  type UserProfileService,
} from '@kbn/content-list-provider';
import { CreatedByCell } from './created_by_cell';

const mockProfile: UserProfile = {
  uid: 'user-1',
  enabled: true,
  user: {
    username: 'jdoe',
    full_name: 'Jane Doe',
    email: 'jdoe@elastic.co',
  },
  data: {
    avatar: { imageUrl: '', initials: 'JD', color: '#FF0000' },
  },
};

const mockUserProfileService: UserProfileService = {
  getUserProfile: jest.fn(async () => mockProfile),
  bulkGetUserProfiles: jest.fn(async () => [mockProfile]),
};

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ContentListProvider
    id="test-list"
    labels={{ entity: 'item', entityPlural: 'items' }}
    dataSource={{ findItems: mockFindItems }}
    services={{ userProfile: mockUserProfileService }}
  >
    {children}
  </ContentListProvider>
);

const createItem = (overrides?: Partial<ContentListItem>): ContentListItem => ({
  id: '1',
  title: 'Test Item',
  ...overrides,
});

describe('CreatedByCell', () => {
  it('renders ManagedAvatarTip for managed items', () => {
    render(
      <Wrapper>
        <CreatedByCell item={createItem({ managed: true })} />
      </Wrapper>
    );

    expect(screen.getByTestId('managedAvatarTip')).toBeInTheDocument();
  });

  it('renders UserAvatarTip for items with createdBy', async () => {
    render(
      <Wrapper>
        <CreatedByCell item={createItem({ createdBy: 'user-1' })} />
      </Wrapper>
    );

    // The `UserAvatarTip` fetches the profile asynchronously.
    const avatar = await screen.findByTestId('userAvatarTip-jdoe');
    expect(avatar).toBeInTheDocument();
  });

  it('renders NoCreatorTip for items without createdBy and not managed', () => {
    render(
      <Wrapper>
        <CreatedByCell item={createItem()} />
      </Wrapper>
    );

    // `NoCreatorTip` renders an `EuiIconTip` with "Additional information" text.
    expect(screen.getByText('Additional information')).toBeInTheDocument();
  });

  it('prioritizes managed over createdBy', () => {
    render(
      <Wrapper>
        <CreatedByCell item={createItem({ managed: true, createdBy: 'user-1' })} />
      </Wrapper>
    );

    // Managed flag takes priority.
    expect(screen.getByTestId('managedAvatarTip')).toBeInTheDocument();
  });
});
