/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren } from 'react';
import { renderHook, act } from '@testing-library/react';
import type { Row } from '@tanstack/react-table';
import type { GroupNode } from '../../../store_provider';
import { DataCascadeProvider, useDataCascadeState } from '../../../store_provider';
import { useCascadeTable, useAdaptedTableRows, type TableProps } from '.';

describe('table', () => {
  const createHookWrapper = ({
    children,
    helper: Helper = React.Fragment,
  }: PropsWithChildren<{ helper?: React.FC<PropsWithChildren> }>) => (
    <DataCascadeProvider cascadeGroups={[]}>
      <Helper>{children}</Helper>
    </DataCascadeProvider>
  );

  describe('useCascadeTable', () => {
    let cascadeState: ReturnType<typeof useDataCascadeState>;

    const TestHelper = ({ children }: PropsWithChildren) => {
      cascadeState = useDataCascadeState();

      return <React.Fragment>{children}</React.Fragment>;
    };

    it('should return the correct values', () => {
      const { result } = renderHook(useCascadeTable, {
        wrapper: createHookWrapper,
        initialProps: {
          initialData: [],
          allowMultipleRowToggle: false,
          enableRowSelection: false,
          header: jest.fn(),
          rowCell: jest.fn(),
        } as TableProps<GroupNode, unknown>,
      });

      expect(result.current).toHaveProperty('headerColumns');
      expect(result.current).toHaveProperty('rows');
    });

    it('table rows value and length is derived from the `initialData` prop', () => {
      const data = Array.from(new Array(10)).map((_, index) => ({
        id: String(index),
        name: `Item ${index}`,
      }));

      const { result } = renderHook(useCascadeTable, {
        wrapper: ({ children }) =>
          createHookWrapper({
            children,
            helper: TestHelper,
          }),
        initialProps: {
          initialData: data,
          allowMultipleRowToggle: false,
          enableRowSelection: false,
          header: jest.fn(),
          rowCell: jest.fn(),
        } as TableProps<GroupNode, unknown>,
      });

      expect(result.current.rows.length).toBe(data.length);
    });

    describe('row expansion', () => {
      it('supports multiple root rows to stay expanded when `allowMultipleRowToggle` is true', () => {
        const data = Array.from(new Array(3)).map((_, index) => ({
          id: String(index),
          name: `Item ${index}`,
        }));

        const { result } = renderHook(useCascadeTable, {
          wrapper: ({ children }) =>
            createHookWrapper({
              children,
              helper: TestHelper,
            }),
          initialProps: {
            initialData: data,
            allowMultipleRowToggle: true,
            enableRowSelection: false,
            header: jest.fn(),
            rowCell: jest.fn(),
          } as TableProps<GroupNode, unknown>,
        });

        expect(Object.keys(cascadeState.table.expanded ?? {})).toHaveLength(0);

        result.current.rows.forEach((row, index) => {
          const rowToggleFn = row.getToggleExpandedHandler();
          expect(rowToggleFn).toBeInstanceOf(Function);
          act(() => rowToggleFn());
          expect(Object.keys(cascadeState.table.expanded)).toHaveLength(index + 1);
        });
      });

      it('should allow only one root row to be expanded at a time when `allowMultipleRowToggle` is false', () => {
        const data = Array.from(new Array(3)).map((_, index) => ({
          id: String(index),
          name: `Item ${index}`,
        }));

        const { result } = renderHook(useCascadeTable, {
          wrapper: ({ children }) =>
            createHookWrapper({
              children,
              helper: TestHelper,
            }),
          initialProps: {
            initialData: data,
            allowMultipleRowToggle: false,
            enableRowSelection: false,
            header: jest.fn(),
            rowCell: jest.fn(),
          } as TableProps<GroupNode, unknown>,
        });

        // Initially no rows should be expanded
        expect(Object.keys(cascadeState.table.expanded ?? {})).toHaveLength(0);

        result.current.rows.forEach((row) => {
          const rowToggleFn = row.getToggleExpandedHandler();
          expect(rowToggleFn).toBeInstanceOf(Function);
          act(() => rowToggleFn());
          // expect table state to consistently have one expanded row
          expect(Object.keys(cascadeState.table.expanded)).toHaveLength(1);
        });
      });
    });
  });

  describe('useTableRowAdapter', () => {
    it('should return only known properties', () => {
      const mockedRowInstance = new Proxy({} as Row<GroupNode>, {
        get: (target, prop) => {
          if (prop === 'id') return 'mocked-id';
          if (prop === 'parentId') return 'mocked-parent-id';
          return jest.fn(() => target);
        },
      });

      const { result } = renderHook(() => useAdaptedTableRows({ rowInstance: mockedRowInstance }));
      expect(Object.keys(result.current)).toMatchInlineSnapshot(`
        Array [
          "rowId",
          "rowParentId",
          "rowIsExpanded",
          "hasAllParentsExpanded",
          "rowDepth",
          "rowChildren",
          "rowChildrenCount",
          "rowVisibleCells",
          "isRowSelected",
          "rowHasSelectedChildren",
          "rowCanSelect",
          "rowSelectionFn",
          "rowToggleFn",
        ]
      `);
      expect(result.current.rowToggleFn).toStrictEqual(expect.any(Function));
      expect(result.current.rowSelectionFn).toStrictEqual(expect.any(Function));
    });
  });
});
