/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import {
  ContentListProvider,
  ProfileCache,
  useProfileCache,
  type ContentListItem,
  type ContentListSupports,
  type FindItemsParams,
  type FindItemsResult,
} from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { buildCreatedByColumn, type CreatedByColumnProps } from './created_by_builder';

type CreatedByColumn = EuiTableFieldDataColumnType<ContentListItem>;

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

const defaultSupports: ContentListSupports = {
  sorting: true,
  pagination: true,
  search: true,
  selection: true,
  tags: false,
  starred: false,
  userProfiles: true,
};

const defaultContext: ColumnBuilderContext = {
  itemConfig: undefined,
  isReadOnly: false,
  entityName: 'dashboard',
  supports: defaultSupports,
};

const CacheSeeder = ({ children }: { children: React.ReactNode }) => {
  const profileCache = useProfileCache();
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    profileCache?.ensureLoaded(mockUsers.map((u) => u.uid)).then(() => setReady(true));
  }, [profileCache]);
  if (!ready) {
    return null;
  }
  return <>{children}</>;
};

const bulkResolve = async (uids: string[]) => mockUsers.filter((u) => uids.includes(u.uid));
const profileCache = new ProfileCache(bulkResolve);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ContentListProvider
    id="test-list"
    labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
    dataSource={{ findItems: mockFindItems }}
    services={{
      userProfiles: { bulkResolve },
    }}
    profileCache={profileCache}
  >
    <CacheSeeder>{children}</CacheSeeder>
  </ContentListProvider>
);

describe('created by column builder', () => {
  it('returns a column with defaults when props are empty', () => {
    const result = buildCreatedByColumn({}, defaultContext);

    expect(result).toMatchObject({
      field: 'createdBy',
      name: 'Created by',
      sortable: false,
      'data-test-subj': 'content-list-table-column-createdBy',
    });
  });

  it('returns undefined when user profiles are unsupported', () => {
    const result = buildCreatedByColumn(
      {},
      {
        ...defaultContext,
        supports: { ...defaultSupports, userProfiles: false },
      }
    );

    expect(result).toBeUndefined();
  });

  it('uses custom title and layout props when provided', () => {
    const result = buildCreatedByColumn(
      {
        columnTitle: 'Owner',
        width: '8em',
        minWidth: '8em',
        maxWidth: '12em',
        truncateText: true,
      } satisfies CreatedByColumnProps,
      defaultContext
    );

    expect(result).toMatchObject({
      name: 'Owner',
      width: '8em',
      minWidth: '8em',
      maxWidth: '12em',
      truncateText: true,
    });
  });

  it('renders a CreatedByCell for the item creator', async () => {
    const result = buildCreatedByColumn({}, defaultContext) as CreatedByColumn;
    const item: ContentListItem = {
      id: '1',
      title: 'Dashboard',
      createdBy: 'u_jane',
    };

    await act(async () => {
      render(result.render?.(item.createdBy, item) as React.ReactElement, { wrapper });
    });

    expect(screen.getByTestId('content-list-createdBy-avatar')).toBeInTheDocument();
  });
});
