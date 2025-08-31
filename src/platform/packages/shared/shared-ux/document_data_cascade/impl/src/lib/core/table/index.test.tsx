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
import type { GroupNode } from '../../../store_provider';
import {
  DataCascadeProvider,
  useDataCascadeActions,
  useDataCascadeState,
} from '../../../store_provider';
import { useTableHelper, useAdaptedTableRows } from '.';
import type { Row } from '@tanstack/react-table';

describe('table', () => {
  const createHookWrapper = ({
    children,
    helper: Helper = React.Fragment,
  }: PropsWithChildren<{ helper?: React.FC<PropsWithChildren> }>) => (
    <DataCascadeProvider cascadeGroups={[]}>
      <Helper>{children}</Helper>
    </DataCascadeProvider>
  );

  describe('useTableHelper', () => {
    let cascadeActions: ReturnType<typeof useDataCascadeActions>;
    let cascadeState: ReturnType<typeof useDataCascadeState>;

    const TestHelper = ({ children }: PropsWithChildren) => {
      cascadeActions = useDataCascadeActions();
      cascadeState = useDataCascadeState();

      return <React.Fragment>{children}</React.Fragment>;
    };

    it('should return the correct values', () => {
      const { result } = renderHook(
        () =>
          useTableHelper({
            allowMultipleRowToggle: false,
            enableRowSelection: false,
            header: jest.fn(),
            rowCell: jest.fn(),
          }),
        {
          wrapper: createHookWrapper,
        }
      );

      expect(result.current).toHaveProperty('headerColumns');
      expect(result.current).toHaveProperty('rows');
    });

    it('computes the table rows from the cascade context', () => {
      const data = Array.from(new Array(10)).map((_, index) => ({
        id: String(index),
        name: `Item ${index}`,
      }));

      const { result } = renderHook(
        () =>
          useTableHelper({
            allowMultipleRowToggle: false,
            enableRowSelection: false,
            header: jest.fn(),
            rowCell: jest.fn(),
          }),
        {
          wrapper: ({ children }) =>
            createHookWrapper({
              children,
              helper: TestHelper,
            }),
        }
      );

      expect(result.current).toHaveProperty('headerColumns');
      expect(result.current).toHaveProperty('rows');
      expect(result.current.rows.length).toBe(0);

      act(() => {
        cascadeActions.setInitialState(data);
      });

      expect(result.current.rows.length).toBe(data.length);
    });

    describe('row expansion', () => {
      it('supports multiple row to be stay expanded when `allowMultipleRowToggle` is true', () => {
        const data = Array.from(new Array(3)).map((_, index) => ({
          id: String(index),
          name: `Item ${index}`,
        }));

        const { result } = renderHook(
          () =>
            useTableHelper({
              allowMultipleRowToggle: true,
              enableRowSelection: false,
              header: jest.fn(),
              rowCell: jest.fn(),
            }),
          {
            wrapper: ({ children }) =>
              createHookWrapper({
                children,
                helper: TestHelper,
              }),
          }
        );

        // configure table with rows
        act(() => {
          cascadeActions.setInitialState(data);
        });

        expect(Object.keys(cascadeState.table.expanded ?? {})).toHaveLength(0);

        result.current.rows.forEach((row, index) => {
          const rowToggleFn = row.getToggleExpandedHandler();
          expect(rowToggleFn).toBeInstanceOf(Function);
          act(() => rowToggleFn());
          expect(Object.keys(cascadeState.table.expanded)).toHaveLength(index + 1);
        });
      });

      it('should allow only one row to be expanded at a time when `allowMultipleRowToggle` is false', () => {
        const data = Array.from(new Array(3)).map((_, index) => ({
          id: String(index),
          name: `Item ${index}`,
        }));

        const { result } = renderHook(
          () =>
            useTableHelper({
              allowMultipleRowToggle: false,
              enableRowSelection: false,
              header: jest.fn(),
              rowCell: jest.fn(),
            }),
          {
            wrapper: ({ children }) =>
              createHookWrapper({
                children,
                helper: TestHelper,
              }),
          }
        );

        // configure table with rows
        act(() => {
          cascadeActions.setInitialState(data);
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
          "rowIsSelected",
          "rowHasSelectedChildren",
          "rowCanSelect",
          "rowSelectionFn",
          "rowToggleFn",
        ]
      `);
      expect(result.current.rowToggleFn).toBe(expect.any(Function));
      expect(result.current.rowSelectionFn).toBe(expect.any(Function));
    });
  });
});
