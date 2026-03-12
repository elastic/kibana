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
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import { useColumns } from './use_columns';
import { Column, NameColumn } from '../column';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const createWrapper =
  (options?: { isReadOnly?: boolean; getHref?: (item: { id: string }) => string }) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems: mockFindItems }}
        isReadOnly={options?.isReadOnly}
        item={options?.getHref ? { getHref: options.getHref } : undefined}
      >
        {children}
      </ContentListProvider>
    );

describe('useColumns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default columns', () => {
    it('returns the default Name column when `children` is `undefined`', () => {
      const { result } = renderHook(() => useColumns(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toMatchObject({
        field: 'title',
        name: 'Name',
        sortable: true,
      });
    });

    it('returns the default Name column when children contain no valid column parts', () => {
      const children = <div>Not a column</div>;

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toMatchObject({
        field: 'title',
        name: 'Name',
      });
    });
  });

  describe('preset columns', () => {
    it('resolves a `Column.Name` preset child', () => {
      const children = <NameColumn columnTitle="Dashboard Name" width="50%" />;

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toMatchObject({
        field: 'title',
        name: 'Dashboard Name',
        width: '50%',
        sortable: true,
      });
    });

    it('respects `sortable={false}` on the Name preset', () => {
      const children = <NameColumn sortable={false} />;

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current[0]).toMatchObject({ sortable: false });
    });
  });

  describe('custom columns', () => {
    it('resolves a custom `Column` child', () => {
      const render = jest.fn(() => <span>custom</span>);
      const children = <Column id="status" name="Status" width="20%" render={render} />;

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toMatchObject({
        field: 'status',
        name: 'Status',
        width: '20%',
      });
    });

    it('uses `field` when provided instead of `id`', () => {
      const render = jest.fn(() => <span>val</span>);
      const children = <Column id="my-col" field="updatedAt" name="Updated" render={render} />;

      const { result } = renderHook(() => useColumns(children), {
        wrapper: createWrapper(),
      });

      expect(result.current[0]).toMatchObject({ field: 'updatedAt' });
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
      expect(result.current[0]).toMatchObject({ field: 'title', name: 'Name' });
      expect(result.current[1]).toMatchObject({ field: 'type', name: 'Type' });
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
      expect(result.current[0]).toMatchObject({ sortable: false });
      expect(result.current[1]).toMatchObject({ sortable: false });
    });
  });
});
