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
import {
  ContentListProvider,
  contentListQueryClient,
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import type { ContentListItemConfig } from '@kbn/content-list-provider';
import { useColumns } from './use_columns';
import { Column, NameColumn } from '../column';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const createWrapper =
  (options?: {
    isReadOnly?: boolean;
    getHref?: (item: { id: string }) => string;
    item?: ContentListItemConfig;
  }) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems: mockFindItems }}
        isReadOnly={options?.isReadOnly}
        item={options?.item ?? (options?.getHref ? { getHref: options.getHref } : undefined)}
      >
        {children}
      </ContentListProvider>
    );

describe('useColumns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    contentListQueryClient.cancelQueries();
    contentListQueryClient.clear();
  });

  describe('default columns', () => {
    it('returns Name and UpdatedAt columns when `children` is `undefined` (no item config)', () => {
      const { result } = renderHook(() => useColumns(undefined), {
        wrapper: createWrapper(),
      });

      // Actions column is omitted because no onEdit/onDelete is configured.
      expect(result.current).toHaveLength(2);
      expect(result.current[0].column).toMatchObject({
        field: 'title',
        name: 'Name',
        sortable: true,
      });
      expect(result.current[1].column).toMatchObject({
        field: 'updatedAt',
        name: 'Last updated',
        sortable: true,
      });
    });

    it('includes Actions column when item config has edit/delete handlers', () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn();
      const wrapper = createWrapper({ item: { onEdit, onDelete } });

      const { result } = renderHook(() => useColumns(undefined, onDelete), {
        wrapper,
      });

      expect(result.current).toHaveLength(3);
      expect(result.current[0].column).toMatchObject({ field: 'title', name: 'Name' });
      expect(result.current[1].column).toMatchObject({ field: 'updatedAt', name: 'Last updated' });
      expect(result.current[2].column).toMatchObject({ name: 'Actions' });
    });

    it('includes only Edit action when only onEdit is configured', () => {
      const onEdit = jest.fn();
      const wrapper = createWrapper({ item: { onEdit } });

      const { result } = renderHook(() => useColumns(undefined), {
        wrapper,
      });

      expect(result.current).toHaveLength(3);
      const actionsColumn = result.current[2].column;
      expect(actionsColumn).toMatchObject({ name: 'Actions' });
      expect((actionsColumn as { actions: unknown[] }).actions).toHaveLength(1);
    });

    it('omits Actions column in read-only mode even with handlers', () => {
      const onEdit = jest.fn();
      const onDelete = jest.fn();
      const wrapper = createWrapper({ isReadOnly: true, item: { onEdit, onDelete } });

      const { result } = renderHook(() => useColumns(undefined, onDelete), {
        wrapper,
      });

      // Actions column is omitted in read-only mode.
      expect(result.current).toHaveLength(2);
      expect(result.current[0].column).toMatchObject({ field: 'title' });
      expect(result.current[1].column).toMatchObject({ field: 'updatedAt' });
    });

    it('returns Name and UpdatedAt when children contain no valid column parts', () => {
      const children = <div>Not a column</div>;

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      // Falls back to defaults; Actions omitted (no item config).
      expect(result.current).toHaveLength(2);
      expect(result.current[0].column).toMatchObject({ field: 'title', name: 'Name' });
      expect(result.current[1].column).toMatchObject({ field: 'updatedAt', name: 'Last updated' });
    });
  });

  describe('preset columns', () => {
    it('resolves a `Column.Name` preset child', () => {
      const children = (
        <NameColumn
          columnTitle="Dashboard Name"
          width="32em"
          minWidth="24em"
          maxWidth="64em"
          truncateText={{ lines: 4 }}
        />
      );

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0].column).toMatchObject({
        field: 'title',
        name: 'Dashboard Name',
        width: '32em',
        minWidth: '24em',
        maxWidth: '64em',
        truncateText: { lines: 4 },
        sortable: true,
      });
    });

    it('respects `sortable={false}` on the Name preset', () => {
      const children = <NameColumn sortable={false} />;

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current[0].column).toMatchObject({ sortable: false });
    });
  });

  describe('custom columns', () => {
    it('resolves a custom `Column` child', () => {
      const render = jest.fn(() => <span>custom</span>);
      const children = (
        <Column
          id="status"
          name="Status"
          width="12em"
          minWidth="10em"
          maxWidth="16em"
          truncateText
          render={render}
        />
      );

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0].column).toMatchObject({
        field: 'status',
        name: 'Status',
        width: '12em',
        minWidth: '10em',
        maxWidth: '16em',
        truncateText: true,
      });
    });

    it('uses `field` when provided instead of `id`', () => {
      const render = jest.fn(() => <span>val</span>);
      const children = <Column id="my-col" field="updatedAt" name="Updated" render={render} />;

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current[0].column).toMatchObject({ field: 'updatedAt' });
    });

    it('uses a custom column skeleton descriptor when provided', () => {
      const render = jest.fn(() => <span>avatar</span>);
      const children = (
        <Column
          id="avatar"
          name="Avatar"
          render={render}
          skeleton={{ shape: 'circle', size: 24 }}
        />
      );

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current[0].skeleton).toEqual({ shape: 'circle', size: 24 });
    });

    it('uses a custom column skeleton callback when provided', () => {
      const render = jest.fn(() => <span>status</span>);
      const skeleton = jest.fn(() => ({ shape: 'rectangle' as const, width: 72, height: 20 }));
      const children = <Column id="status" name="Status" render={render} skeleton={skeleton} />;

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current[0].skeleton).toEqual({ shape: 'rectangle', width: 72, height: 20 });
      expect(skeleton).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'dashboard',
        })
      );
    });
  });

  describe('multiple columns', () => {
    it('preserves column order from children', () => {
      const render = jest.fn(() => <span>type</span>);
      const children = (
        <>
          <NameColumn />
          <Column id="type" name="Type" render={render} />
        </>
      );

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(2);
      expect(result.current[0].column).toMatchObject({ field: 'title', name: 'Name' });
      expect(result.current[1].column).toMatchObject({ field: 'type', name: 'Type' });
    });
  });

  describe('builder context', () => {
    it('disables sorting when provider does not support it', () => {
      const render = jest.fn(() => <span>val</span>);
      const children = (
        <>
          <NameColumn />
          <Column id="status" name="Status" sortable render={render} />
        </>
      );

      const Wrapper = ({ children: c }: { children: React.ReactNode }) => (
        <ContentListProvider
          id="test-list"
          labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
          dataSource={{ findItems: mockFindItems }}
          features={{ sorting: false }}
        >
          {c}
        </ContentListProvider>
      );

      const { result } = renderHook(() => useColumns(children), {
        wrapper: Wrapper,
      });

      // Both columns should have sorting disabled.
      expect(result.current[0].column).toMatchObject({ sortable: false });
      expect(result.current[1].column).toMatchObject({ sortable: false });
    });
  });
});
