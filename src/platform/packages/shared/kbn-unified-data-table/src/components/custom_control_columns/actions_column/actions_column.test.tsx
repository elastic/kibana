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
import { RowControlColumn } from '@kbn/discover-utils';
import { render, within, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as actionsHeader from './actions_header';
import { UnifiedDataTableContext } from '../../../table_context';
import { dataTableContextComplexMock } from '../../../../__mocks__/table_context';

describe('getActionsColumn', () => {
  describe('given no columns', () => {
    it('returns null', () => {
      const result = getActionsColumn({
        baseColumns: [],
        externalControlColumns: undefined,
        rowAdditionalLeadingControls: undefined,
      });
      expect(result).toBeNull();
    });
  });

  describe.each([
    {
      baseColumns: [() => <div>Base column</div>],
      rowAdditionalLeadingControls: [],
      externalControlColumns: [],
      expectedWidth: 24,
      expectedTexts: ['Base column'],
      description: '1 base column',
    },
    {
      baseColumns: [() => <div>Base column 1</div>, () => <div>Base column 2</div>],
      rowAdditionalLeadingControls: [],
      externalControlColumns: [],
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
      externalControlColumns: [],
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
      externalControlColumns: [],
      expectedWidth: 48,
      expectedTexts: ['Row control column 1', 'Row control column 2'],
      description: '2 row additional leading control columns',
    },
    {
      baseColumns: [],
      rowAdditionalLeadingControls: [],
      externalControlColumns: [
        {
          id: 'external-1',
          width: 80,
          rowCellRender: () => <div>External control column</div>,
          headerCellRender: () => <div>External control column</div>,
        },
      ],
      expectedWidth: 80,
      expectedTexts: ['External control column'],
      description: '1 external control column',
    },
    {
      baseColumns: [],
      rowAdditionalLeadingControls: [],
      externalControlColumns: [
        {
          id: 'external-1',
          width: 80,
          rowCellRender: () => <div>External control column 1</div>,
          headerCellRender: () => <div>External control column 1</div>,
        },
        {
          id: 'external-2',
          width: 90,
          rowCellRender: () => <div>External control column 2</div>,
          headerCellRender: () => <div>External control column 2</div>,
        },
      ],
      expectedWidth: 170,
      expectedTexts: ['External control column 1', 'External control column 2'],
      description: '2 external control columns',
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
      externalControlColumns: [],
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
      baseColumns: [() => <div>Base column 1</div>, () => <div>Base column 2</div>],
      rowAdditionalLeadingControls: [],
      externalControlColumns: [
        {
          id: 'external-1',
          width: 80,
          rowCellRender: () => <div>External control column 1</div>,
          headerCellRender: () => <div>External control column 1</div>,
        },
        {
          id: 'external-2',
          width: 90,
          rowCellRender: () => <div>External control column 2</div>,
          headerCellRender: () => <div>External control column 2</div>,
        },
      ],
      expectedWidth: 222,
      expectedTexts: [
        'Base column 1',
        'Base column 2',
        'External control column 1',
        'External control column 2',
      ],
      description: '2 base columns and 2 external control columns',
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
      externalControlColumns: [
        {
          id: 'external-1',
          width: 80,
          rowCellRender: () => <div>External control column 1</div>,
          headerCellRender: () => <div>External control column 1</div>,
        },
        {
          id: 'external-2',
          width: 90,
          rowCellRender: () => <div>External control column 2</div>,
          headerCellRender: () => <div>External control column 2</div>,
        },
      ],
      expectedWidth: 218,
      expectedTexts: [
        'Row control column 1',
        'Row control column 2',
        'External control column 1',
        'External control column 2',
      ],
      description: '2 row additional leading columns and 2 external control columns',
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
      externalControlColumns: [
        {
          id: 'external-1',
          width: 80,
          rowCellRender: () => <div>External control column 1</div>,
          headerCellRender: () => <div>External control column 1</div>,
        },
        {
          id: 'external-2',
          width: 90,
          rowCellRender: () => <div>External control column 2</div>,
          headerCellRender: () => <div>External control column 2</div>,
        },
      ],
      expectedWidth: 270,
      expectedTexts: [
        'Base column 1',
        'Base column 2',
        'Row control column 1',
        'Row control column 2',
        'External control column 1',
        'External control column 2',
      ],
      description: '2 of each column type',
    },
  ])(
    'given $description',
    ({
      expectedWidth,
      expectedTexts,
      baseColumns,
      rowAdditionalLeadingControls,
      externalControlColumns,
    }) => {
      it('returns a column with the correct width', () => {
        const result = getActionsColumn({
          baseColumns,
          rowAdditionalLeadingControls:
            rowAdditionalLeadingControls as unknown as RowControlColumn[],
          externalControlColumns,
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
          externalControlColumns,
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
          externalControlColumns,
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
        externalControlColumns: [],
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
      expect(screen.getByLabelText('Additional actions')).toBeVisible();
      await user.click(screen.getByLabelText('Additional actions'));

      rowAdditionalLeadingControls.slice(1).forEach((control) => {
        expect(screen.getByTestId(`unifiedDataTable_rowMenu_${control.id}`)).toBeVisible();
      });
    });
  });
});
