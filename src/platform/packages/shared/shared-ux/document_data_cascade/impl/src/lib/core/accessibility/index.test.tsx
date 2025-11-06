/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuid } from 'uuid';
import React, { useState, type FC } from 'react';
import { renderHook, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { type Row } from '../table';
import {
  useTreeGridContainerARIAAttributes,
  useTreeGridRowARIAAttributes,
  useRegisterCascadeAccessibilityHelpers,
} from '.';

const createMockedRowInstance = (overrides: Partial<Row<any>> = {}) => {
  return new Proxy({ id: uuid(), subRows: [], depth: 0, ...overrides } as Row<any>, {
    get: (target, prop) => {
      // catch all for function getters not explicitly catered for
      if (/get[a-zA-Z]/.test(prop as string) && !(prop in target)) {
        return jest.fn(() => prop);
      }

      return Reflect.get(target, prop) ?? prop;
    },
  });
};

describe('accessibility', () => {
  describe('useTreeGridContainerARIAAttributes', () => {
    it('should return the correct ARIA attributes for the tree grid container', () => {
      const { result } = renderHook(() => useTreeGridContainerARIAAttributes('some-id'));
      expect(result.current).toMatchInlineSnapshot(`
        Object {
          "aria-labelledby": "some-id",
          "aria-multiselectable": false,
          "aria-readonly": true,
          "aria-rowcount": -1,
          "role": "treegrid",
        }
      `);
    });
  });

  describe('useTreeGridRowARIAAttributes', () => {
    it('should set the correct aria-level attribute for the tree grid row, based on the table row depth value', () => {
      const mockedRowInstance = createMockedRowInstance({
        depth: 0,
      });

      const { result } = renderHook(() =>
        useTreeGridRowARIAAttributes({ rowInstance: mockedRowInstance, virtualRowIndex: 0 })
      );

      expect(result.current).toEqual(
        expect.objectContaining({
          'aria-level': 1,
        })
      );
    });

    it('should return the correct aria-expanded for the tree grid row based on the table row expanded value', () => {
      const mockedRowInstance = createMockedRowInstance({
        getIsExpanded: jest.fn(() => true),
      });

      const { result } = renderHook(() =>
        useTreeGridRowARIAAttributes({ rowInstance: mockedRowInstance, virtualRowIndex: 0 })
      );

      expect(result.current).toEqual(
        expect.objectContaining({
          'aria-expanded': true,
        })
      );
    });

    it('should return the correct aria-owns attribute for the tree grid row based on the table row', () => {
      const mockedSubRows = Array.from(new Array(3)).map(() => createMockedRowInstance());

      const mockedRowInstance = createMockedRowInstance({
        subRows: mockedSubRows,
      });

      const { result } = renderHook(() =>
        useTreeGridRowARIAAttributes({ rowInstance: mockedRowInstance, virtualRowIndex: 0 })
      );

      expect(result.current).toEqual(
        expect.objectContaining({
          id: mockedRowInstance.id,
          'aria-owns': mockedSubRows.map((row) => row.id).join(' '),
        })
      );
    });
  });

  describe('useRegisterCascadeAccessibilityHelpers', () => {
    const SUTUsingCascadeAccessibilityHelper: FC<{
      tableRows: Row<any>[];
    }> = ({ tableRows }) => {
      const [wrapperElRef, setWrapperElRef] = useState<HTMLDivElement | null>(null);

      useRegisterCascadeAccessibilityHelpers<any>({
        tableRows,
        tableWrapperElement: wrapperElRef,
        scrollToRowIndex: jest.fn(),
      });

      return (
        <div
          ref={(node) => {
            if (node) {
              setWrapperElRef(node);
            }
          }}
          role="treegrid"
        >
          {tableRows.map((row) => (
            <div role="row" id={row.id} tabIndex={0} key={row.id}>
              {`row_${row.id}`}
            </div>
          ))}
        </div>
      );
    };

    describe('keyboard interaction', () => {
      describe('pressing ArrowRight when focus is on a row element', () => {
        it('should invoke the rowToggle function if the row is not expanded', async () => {
          const rowToggleFn = jest.fn(() => {
            /* noop row expander */
          });

          const rowCount = 10;

          const tableRows = Array.from(new Array(rowCount)).map(() =>
            createMockedRowInstance({
              // all rows are configured not to be expanded
              getIsExpanded: jest.fn(() => false),
              getToggleExpandedHandler: () => rowToggleFn,
            })
          );

          render(<SUTUsingCascadeAccessibilityHelper tableRows={tableRows} />);

          const randomRowIndex = Math.floor(Math.random() * rowCount);

          await waitFor(() => {
            // apply focus on random row of choice
            screen.getByRole('row', { name: `row_${tableRows[randomRowIndex].id}` }).focus();

            // fire keydown for ArrowRight
            fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });

            // verify rowToggleFn was invoked
            expect(rowToggleFn).toHaveBeenCalled();
          });
        });

        it('should not invoke the rowToggle function if the row is expanded and has no children', async () => {
          const rowToggleFn = jest.fn(() => {
            /* noop row expander */
          });

          const rowCount = 10;

          const expandedRowIndex = Math.floor(Math.random() * rowCount);

          const tableRows = Array.from(new Array(rowCount)).map((_, idx) =>
            createMockedRowInstance({
              getIsExpanded: jest.fn(() => (expandedRowIndex === idx ? true : false)),
              getToggleExpandedHandler: () => rowToggleFn,
            })
          );

          render(<SUTUsingCascadeAccessibilityHelper tableRows={tableRows} />);

          await waitFor(() => {
            // apply focus on the expanded row (use the actual row from tableRows array)
            screen.getByRole('row', { name: `row_${tableRows[expandedRowIndex].id}` }).focus();

            // fire keydown for ArrowRight
            fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });

            // verify rowToggleFn was NOT invoked (row is already expanded)
            expect(rowToggleFn).not.toHaveBeenCalled();
          });
        });
      });

      describe('pressing ArrowLeft when focus is on a row element', () => {
        it('should not invoke the rowToggle function if the row is not expanded', async () => {
          const rowToggleFn = jest.fn(() => {
            /* noop row expander */
          });

          const rowCount = 10;

          const tableRows = Array.from(new Array(rowCount)).map(() =>
            createMockedRowInstance({
              // all rows are configured not to be expanded
              getIsExpanded: jest.fn(() => false),
              getToggleExpandedHandler: () => rowToggleFn,
            })
          );

          render(<SUTUsingCascadeAccessibilityHelper tableRows={tableRows} />);

          const randomRowIndex = Math.floor(Math.random() * rowCount);

          await waitFor(() => {
            // apply focus on random row of choice
            screen.getByRole('row', { name: `row_${tableRows[randomRowIndex].id}` }).focus();

            // fire keydown for ArrowLeft
            fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });

            // verify rowToggleFn was invoked
            expect(rowToggleFn).not.toHaveBeenCalled();
          });
        });

        it('should invoke the rowToggle function if the row is expanded', async () => {
          const rowToggleFn = jest.fn(() => {
            /* noop row expander */
          });

          const rowCount = 10;

          const expandedRowIndex = Math.floor(Math.random() * rowCount);

          const tableRows = Array.from(new Array(rowCount)).map((_, idx) =>
            createMockedRowInstance({
              getIsExpanded: jest.fn(() => (expandedRowIndex === idx ? true : false)),
              getToggleExpandedHandler: () => rowToggleFn,
            })
          );

          render(<SUTUsingCascadeAccessibilityHelper tableRows={tableRows} />);

          await waitFor(() => {
            // apply focus on row of choice
            screen.getByRole('row', { name: `row_${tableRows[expandedRowIndex].id}` }).focus();

            // fire keydown for ArrowLeft
            fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });

            // verify rowToggleFn was invoked
            expect(rowToggleFn).toHaveBeenCalled();
          });
        });
      });
    });
  });
});
