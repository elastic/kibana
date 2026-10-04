/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { getActionsColumn } from './actions_column';
import type { RowControlColumn } from '@kbn/discover-utils';
import { render, within, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as actionsHeader from './actions_header';
import { UnifiedDataTableContext } from '../../../table_context';
import { dataTableContextComplexMock } from '../../../../__mocks__/table_context';

describe('getActionsColumn', () => {
  describe('given no columns', () => {
    it('returns null', () => {
      const result = getActionsColumn({
        baseColumns: [],
        rowAdditionalLeadingControls: undefined,
      });
      expect(result).toBeNull();
    });
  });

  describe.each([
    {
      baseColumns: [() => <div>Base column</div>],
      rowAdditionalLeadingControls: [],
      expectedWidth: 24,
      expectedTexts: ['Base column'],
      description: '1 base column',
    },
    {
      baseColumns: [() => <div>Base column 1</div>, () => <div>Base column 2</div>],
      rowAdditionalLeadingControls: [],
      expectedWidth: 48,
      expectedTexts: ['Base column 1', 'Base column 2'],
      description: '2 base columns',
    },
    {
      baseColumns: [],
      rowAdditionalLeadingControls: [
        {
          id: 'row-control-column',
          render: () => <div>Row control column</div>,
        },
      ],
      expectedWidth: 24,
      expectedTexts: ['Row control column'],
      description: '1 row additional leading control column',
    },
    {
      baseColumns: [],
      rowAdditionalLeadingControls: [
        {
          id: 'row-control-column-1',
          render: () => <div>Row control column 1</div>,
        },
        {
          id: 'row-control-column-2',
          render: () => <div>Row control column 2</div>,
        },
      ],
      expectedWidth: 48,
      expectedTexts: ['Row control column 1', 'Row control column 2'],
      description: '2 row additional leading control columns',
    },
    {
      baseColumns: [() => <div>Base column 1</div>, () => <div>Base column 2</div>],
      rowAdditionalLeadingControls: [
        {
          id: 'row-control-column-1',
          render: () => <div>Row control column 1</div>,
        },
        {
          id: 'row-control-column-2',
          render: () => <div>Row control column 2</div>,
        },
      ],
      expectedWidth: 96,
      expectedTexts: [
        'Base column 1',
        'Base column 2',
        'Row control column 1',
        'Row control column 2',
      ],
      description: '2 base columns and 2 row additional leading control columns',
    },
    {
      description: 'additional leading column with custom width',
      baseColumns: [],
      rowAdditionalLeadingControls: [
        {
          id: 'row-control-column',
          render: () => <div>Row control column</div>,
          width: 80,
        },
      ],
      expectedWidth: 80,
      expectedTexts: ['Row control column'],
    },
    {
      description: 'additional leading column with custom width + extra options',
      baseColumns: [],
      rowAdditionalLeadingControls: [
        {
          id: 'row-control-column',
          render: () => <div>Row control column</div>,
          width: 80,
        },
        {
          id: 'row-control-column-2',
          render: () => <div>Row control column 2</div>,
        },
        {
          id: 'row-control-column-2',
          render: () => <div>Row control column 2</div>,
        },
      ],
      expectedWidth: 104, // 80 from the first column + 24 from the menu column
      expectedTexts: ['Row control column'],
    },
  ])(
    'given $description',
    ({ expectedWidth, expectedTexts, baseColumns, rowAdditionalLeadingControls }) => {
      it('returns a column with the correct width', () => {
        const result = getActionsColumn({
          baseColumns,
          rowAdditionalLeadingControls:
            rowAdditionalLeadingControls as unknown as RowControlColumn[],
        });
        expect(result).toEqual(
          expect.objectContaining({
            width: expectedWidth,
          })
        );
      });

      it('should return the header cell render function', () => {
        // Given
        const actionsHeaderSpy = jest.spyOn(actionsHeader, 'ActionsHeader');

        // When
        const result = getActionsColumn({
          baseColumns,
          rowAdditionalLeadingControls:
            rowAdditionalLeadingControls as unknown as RowControlColumn[],
        });
        expect(result?.headerCellRender).toBeInstanceOf(Function);

        // Then
        render(result?.headerCellRender());
        expect(actionsHeaderSpy).toHaveBeenCalledWith(
          {
            maxWidth: expectedWidth,
          },
          {}
        );
      });

      it('should return the row cell render function', () => {
        // Given
        const result = getActionsColumn({
          baseColumns,
          rowAdditionalLeadingControls,
        });
        expect(result?.rowCellRender).toBeInstanceOf(Function);

        // When
        render(
          <UnifiedDataTableContext.Provider value={dataTableContextComplexMock}>
            {result?.rowCellRender({
              setCellProps: jest.fn(),
              rowIndex: 0,
              colIndex: 0,
              columnId: 'actions',
              isExpandable: false,
              isExpanded: false,
              isDetails: false,
            })}
          </UnifiedDataTableContext.Provider>
        );

        // Then
        expectedTexts.forEach((text) => {
          within(screen.getByTestId('unifiedDataTable_actionsColumnCell')).getByText(text);
        });
      });
    }
  );

  describe('visibleRowLeadingControls forwarding', () => {
    it('forwards visibleRowLeadingControls so 3 controls render inline when totalVisible=3', async () => {
      const rowAdditionalLeadingControls: RowControlColumn[] = [
        {
          id: 'a',
          render: (Control) => (
            <Control data-test-subj="a" label="a" iconType="empty" onClick={jest.fn()} />
          ),
        },
        {
          id: 'b',
          render: (Control) => (
            <Control data-test-subj="b" label="b" iconType="empty" onClick={jest.fn()} />
          ),
        },
        {
          id: 'c',
          render: (Control) => (
            <Control data-test-subj="c" label="c" iconType="empty" onClick={jest.fn()} />
          ),
        },
      ];

      const result = getActionsColumn({
        baseColumns: [],
        rowAdditionalLeadingControls,
        visibleRowLeadingControls: 3,
      });

      render(
        <UnifiedDataTableContext.Provider value={dataTableContextComplexMock}>
          {result?.rowCellRender({
            setCellProps: jest.fn(),
            rowIndex: 0,
            colIndex: 0,
            columnId: 'actions',
            isExpandable: false,
            isExpanded: false,
            isDetails: false,
          })}
        </UnifiedDataTableContext.Provider>
      );

      expect(screen.getByTestId('a')).toBeVisible();
      expect(screen.getByTestId('b')).toBeVisible();
      expect(screen.getByTestId('c')).toBeVisible();
      expect(
        screen.queryByTestId('unifiedDataTable_additionalRowControl_actionsMenu')
      ).not.toBeInTheDocument();
    });
  });

  describe('given 4 row additional leading control columns', () => {
    const rowAdditionalLeadingControls: RowControlColumn[] = [
      {
        id: 'row-control-column-1',
        render: (Control) => (
          <Control iconType="empty" label="Row control column 1" onClick={jest.fn()} />
        ),
      },
      {
        id: 'row-control-column-2',
        render: (Control) => (
          <Control iconType="empty" label="Row control column 2" onClick={jest.fn()} />
        ),
      },
      {
        id: 'row-control-column-3',
        render: (Control) => (
          <Control iconType="empty" label="Row control column 3" onClick={jest.fn()} />
        ),
      },
      {
        id: 'row-control-column-4',
        render: (Control) => (
          <Control iconType="empty" label="Row control column 4" onClick={jest.fn()} />
        ),
      },
    ];

    it('should return a menu control column', async () => {
      // Given
      const user = userEvent.setup();

      // When
      const result = getActionsColumn({
        baseColumns: [],
        rowAdditionalLeadingControls,
      });

      render(
        <UnifiedDataTableContext.Provider value={dataTableContextComplexMock}>
          {result?.rowCellRender({
            setCellProps: jest.fn(),
            rowIndex: 0,
            colIndex: 0,
            columnId: 'actions',
            isExpandable: false,
            isExpanded: false,
            isDetails: false,
          })}
        </UnifiedDataTableContext.Provider>
      );

      // Then

      // The first item appears by itself
      expect(
        screen.getByTestId(`unifiedDataTable_rowControl_${rowAdditionalLeadingControls[0].id}`)
      );

      // The rest of the items are in a menu
      expect(screen.getByTestId('unifiedDataTable_additionalRowControl_actionsMenu')).toBeVisible();
      await user.click(screen.getByTestId('unifiedDataTable_additionalRowControl_actionsMenu'));

      await waitFor(() => {
        rowAdditionalLeadingControls.slice(1).forEach((control) => {
          expect(screen.getByTestId(`unifiedDataTable_rowMenu_${control.id}`)).toBeVisible();
        });
      });
    });
  });
});
