/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { ContentListProvider } from '../context';
import type { ContentListItem, ContentListItemConfig } from '../item';
import type { FindItemsResult, FindItemsParams } from '../datasource';
import { useBulkActionRestrictions } from './use_bulk_action_restrictions';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

interface WrapperOptions {
  item?: ContentListItemConfig;
}

const createWrapper =
  ({ item }: WrapperOptions = {}) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems: mockFindItems }}
        {...(item ? { item } : {})}
      >
        {children}
      </ContentListProvider>
    );

const sampleItem = { id: '1', title: 'Item 1' } as ContentListItem;

const restrictManaged = (i: ContentListItem) => (i.managed ? 'managed' : undefined);

describe('useBulkActionRestrictions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array when no actions are configured', () => {
    const { result } = renderHook(() => useBulkActionRestrictions(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual([]);
  });

  it('returns an empty array when `actions.delete.onBulkAction` is configured without a `restriction`', () => {
    // Without a restriction predicate the action is unrestricted.
    const { result } = renderHook(() => useBulkActionRestrictions(), {
      wrapper: createWrapper({
        item: { actions: { delete: { onBulkAction: jest.fn(async () => {}) } } },
      }),
    });

    expect(result.current).toEqual([]);
  });

  it('returns an empty array when only `actions.delete.restriction` is configured (no `onBulkAction`)', () => {
    // Delete is not bulk-eligible without `onBulkAction`.
    // Cast through `unknown` to construct the "invalid" config and verify the runtime gate.
    const invalidItem = {
      actions: { delete: { restriction: restrictManaged } },
    } as unknown as ContentListItemConfig;

    const { result } = renderHook(() => useBulkActionRestrictions(), {
      wrapper: createWrapper({ item: invalidItem }),
    });

    expect(result.current).toEqual([]);
  });

  it('publishes the delete restriction when both `onBulkAction` and `restriction` are configured', () => {
    const { result } = renderHook(() => useBulkActionRestrictions(), {
      wrapper: createWrapper({
        item: {
          actions: {
            delete: { onBulkAction: jest.fn(async () => {}), restriction: restrictManaged },
          },
        },
      }),
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].actionId).toBe('delete');
    expect(result.current[0].restriction({ ...sampleItem, managed: true })).toBe('managed');
    expect(result.current[0].restriction({ ...sampleItem, managed: false })).toBeUndefined();
  });

  it('does not publish row-only action entries (e.g. `actions.edit`)', () => {
    const { result } = renderHook(() => useBulkActionRestrictions(), {
      wrapper: createWrapper({
        item: {
          actions: {
            edit: { onItemAction: jest.fn(), restriction: () => 'cannot edit' },
            delete: { onBulkAction: jest.fn(async () => {}), restriction: restrictManaged },
          },
        },
      }),
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].actionId).toBe('delete');
  });

  it('publishes custom bulk-eligible actions (e.g. `actions.archive`)', () => {
    // Custom action IDs flow through the same registry pipeline.
    const restrictArchived = (i: ContentListItem) =>
      (i as ContentListItem & { archived?: boolean }).archived ? 'already archived' : undefined;

    const { result } = renderHook(() => useBulkActionRestrictions(), {
      wrapper: createWrapper({
        item: {
          actions: {
            delete: { onBulkAction: jest.fn(async () => {}), restriction: restrictManaged },
            archive: { onBulkAction: jest.fn(async () => {}), restriction: restrictArchived },
          },
        },
      }),
    });

    expect(result.current.map((entry) => entry.actionId).sort()).toEqual(['archive', 'delete']);
  });

  it('preserves array identity across renders when `itemConfig` does not change', () => {
    const item: ContentListItemConfig = {
      actions: {
        delete: { onBulkAction: jest.fn(async () => {}), restriction: restrictManaged },
      },
    };

    const { result, rerender } = renderHook(() => useBulkActionRestrictions(), {
      wrapper: createWrapper({ item }),
    });

    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('returns an empty array when used outside a `ContentListProvider`', () => {
    const { result } = renderHook(() => useBulkActionRestrictions());
    expect(result.current).toEqual([]);
  });

  it('serves the same registry to multiple readers under one provider, and one reader unmounting does not affect the other', () => {
    // With the provider-derived projection there is one source of truth,
    // so multiple readers see the same array and unmounting any reader
    // does not perturb others.
    const item: ContentListItemConfig = {
      actions: {
        delete: { onBulkAction: jest.fn(async () => {}), restriction: restrictManaged },
      },
    };
    const wrapper = createWrapper({ item });

    const readerA = renderHook(() => useBulkActionRestrictions(), { wrapper });
    const readerB = renderHook(() => useBulkActionRestrictions(), { wrapper });

    expect(readerA.result.current).toHaveLength(1);
    expect(readerB.result.current).toHaveLength(1);
    expect(readerA.result.current[0].restriction).toBe(item.actions!.delete!.restriction);
    expect(readerB.result.current[0].restriction).toBe(item.actions!.delete!.restriction);

    readerA.unmount();

    // Reader B's view is unaffected by Reader A's unmount.
    expect(readerB.result.current).toHaveLength(1);
    expect(readerB.result.current[0].restriction).toBe(item.actions!.delete!.restriction);
  });
});
