/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAdditionalRowControlColumns } from './get_additional_row_control_columns';
import { mockRowAdditionalLeadingControls } from '../../../../__mocks__/external_control_columns';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { UnifiedDataTableContext } from '../../../table_context';
import { dataTableContextComplexMock } from '../../../../__mocks__/table_context';
import { userEvent } from '@testing-library/user-event';
import type { RowControlColumn, RowControlComponent } from '@kbn/discover-utils';

const setup = (rowControlColumns: RowControlColumn[], visibleRowLeadingControls?: number) => {
  const { columns } = getAdditionalRowControlColumns(rowControlColumns, visibleRowLeadingControls);

  render(
    <UnifiedDataTableContext.Provider value={dataTableContextComplexMock}>
      {columns.map((Column, idx) => (
        <Column
          key={idx}
          setCellProps={jest.fn()}
          rowIndex={0}
          colIndex={0}
          columnId="actions"
          isExpandable
          isExpanded
          isDetails
        />
      ))}
    </UnifiedDataTableContext.Provider>
  );
};

describe('getAdditionalRowControlColumns', () => {
  it('should work correctly for 0 controls', () => {
    const { columns, totalWidth } = getAdditionalRowControlColumns([]);

    expect(columns).toHaveLength(0);
    expect(totalWidth).toBe(0);
  });

  it('should work correctly for 1 control', () => {
    // Given
    const rowControlColumnMock = mockRowAdditionalLeadingControls[0];

    // When
    setup([rowControlColumnMock]);

    // Then
    expect(screen.getByTestId(rowControlColumnMock.id)).toBeVisible();
  });

  it('should work correctly for 2 controls', () => {
    // Given
    const mocks = [mockRowAdditionalLeadingControls[0], mockRowAdditionalLeadingControls[1]];

    // When
    setup(mocks);

    // Then
    expect(screen.getByTestId(mocks[0].id)).toBeVisible();
    expect(screen.getByTestId(mocks[1].id)).toBeVisible();
  });

  it('should work correctly for 3 and more controls', async () => {
    // Given
    const user = userEvent.setup();
    const mocks = [
      mockRowAdditionalLeadingControls[0],
      mockRowAdditionalLeadingControls[1],
      mockRowAdditionalLeadingControls[2],
    ];

    // When
    setup(mocks);

    // Then
    expect(screen.getByTestId(mocks[0].id)).toBeVisible();

    // The other elements are hidden under the menu button
    await user.click(screen.getByTestId('unifiedDataTable_additionalRowControl_actionsMenu'));

    await waitFor(() => {
      expect(screen.getByTestId(mocks[1].id)).toBeVisible();
      expect(screen.getByTestId(mocks[2].id)).toBeVisible();
    });
  });

  it('should calculate total width correctly for 2 controls', () => {
    const mocks = [
      { ...mockRowAdditionalLeadingControls[0], width: 50 },
      { ...mockRowAdditionalLeadingControls[1], width: 70 },
    ];

    const { totalWidth } = getAdditionalRowControlColumns(mocks);

    expect(totalWidth).toBe(120);
  });

  it('should calculate total width correctly for 3 controls', () => {
    const mocks = [
      { ...mockRowAdditionalLeadingControls[0], width: 50 },
      { ...mockRowAdditionalLeadingControls[1] },
      { ...mockRowAdditionalLeadingControls[2] },
    ];

    const { totalWidth } = getAdditionalRowControlColumns(mocks);

    expect(totalWidth).toBe(74); // 50 (first control) + 24 (menu button default width)
  });

  describe('with visibleRowLeadingControls = 3', () => {
    it('renders 3 controls inline (n <= totalVisible)', () => {
      const mocks = [
        mockRowAdditionalLeadingControls[0],
        mockRowAdditionalLeadingControls[1],
        mockRowAdditionalLeadingControls[2],
      ];

      setup(mocks, 3);

      expect(screen.getByTestId(mocks[0].id)).toBeVisible();
      expect(screen.getByTestId(mocks[1].id)).toBeVisible();
      expect(screen.getByTestId(mocks[2].id)).toBeVisible();
      expect(
        screen.queryByTestId('unifiedDataTable_additionalRowControl_actionsMenu')
      ).not.toBeInTheDocument();
    });

    it('renders 2 inline + menu when n > totalVisible', async () => {
      const user = userEvent.setup();
      const fourthMock: RowControlColumn = {
        id: 'exampleRowControl-fourth',
        render: (Control) => (
          <Control
            data-test-subj="exampleRowControl-fourth"
            label="Fourth"
            iconType="empty"
            onClick={jest.fn()}
          />
        ),
      };
      const mocks = [
        mockRowAdditionalLeadingControls[0],
        mockRowAdditionalLeadingControls[1],
        mockRowAdditionalLeadingControls[2],
        fourthMock,
      ];

      setup(mocks, 3);

      expect(screen.getByTestId(mocks[0].id)).toBeVisible();
      expect(screen.getByTestId(mocks[1].id)).toBeVisible();

      await user.click(screen.getByTestId('unifiedDataTable_additionalRowControl_actionsMenu'));
      await waitFor(() => {
        expect(screen.getByTestId(mocks[2].id)).toBeVisible();
        expect(screen.getByTestId(fourthMock.id)).toBeVisible();
      });
    });

    it('calculates totalWidth for the collapsed branch (n > totalVisible)', () => {
      const mocks = [
        { ...mockRowAdditionalLeadingControls[0], width: 50 },
        { ...mockRowAdditionalLeadingControls[1], width: 30 },
        { ...mockRowAdditionalLeadingControls[2] },
        {
          id: 'exampleRowControl-fourth',
          render: (Control: RowControlComponent) => (
            <Control label="Fourth" iconType="empty" onClick={jest.fn()} />
          ),
        },
      ];

      const { totalWidth } = getAdditionalRowControlColumns(mocks, 3);

      // 50 + 30 (first two visible) + 24 (menu)
      expect(totalWidth).toBe(104);
    });
  });

  describe('isAvailable predicate', () => {
    it('excludes an action with isAvailable: () => false from inline slots', () => {
      const unavailable: RowControlColumn = {
        id: 'unavailable',
        isAvailable: () => false,
        render: (Control) => (
          <Control
            data-test-subj="unavailable"
            label="Unavailable"
            iconType="empty"
            onClick={jest.fn()}
          />
        ),
      };
      setup([mockRowAdditionalLeadingControls[0], unavailable]);

      expect(screen.getByTestId(mockRowAdditionalLeadingControls[0].id)).toBeVisible();
      expect(screen.queryByTestId('unavailable')).not.toBeInTheDocument();
    });

    it('excludes an action with isAvailable: () => false from the overflow menu', async () => {
      const user = userEvent.setup();
      const unavailable: RowControlColumn = {
        id: 'unavailable',
        isAvailable: () => false,
        render: (Control) => (
          <Control
            data-test-subj="unavailable"
            label="Unavailable"
            iconType="empty"
            onClick={jest.fn()}
          />
        ),
      };
      // 3 controls with default visibleRowLeadingControls (2): 1 inline + menu
      setup([
        mockRowAdditionalLeadingControls[0],
        mockRowAdditionalLeadingControls[1],
        unavailable,
      ]);

      await user.click(screen.getByTestId('unifiedDataTable_additionalRowControl_actionsMenu'));
      await waitFor(() => {
        expect(screen.getByTestId(mockRowAdditionalLeadingControls[1].id)).toBeVisible();
        expect(screen.queryByTestId('unavailable')).not.toBeInTheDocument();
      });
    });

    it('hides the overflow menu when all menu items are unavailable', () => {
      const unavailable1: RowControlColumn = {
        id: 'unavailable-1',
        isAvailable: () => false,
        render: (Control) => (
          <Control
            data-test-subj="unavailable-1"
            label="Unavailable 1"
            iconType="empty"
            onClick={jest.fn()}
          />
        ),
      };
      const unavailable2: RowControlColumn = {
        id: 'unavailable-2',
        isAvailable: () => false,
        render: (Control) => (
          <Control
            data-test-subj="unavailable-2"
            label="Unavailable 2"
            iconType="empty"
            onClick={jest.fn()}
          />
        ),
      };
      // 3 controls with default visibleRowLeadingControls (2): 1 inline + menu
      // Both menu items are unavailable → menu button should not render
      setup([mockRowAdditionalLeadingControls[0], unavailable1, unavailable2]);

      expect(screen.getByTestId(mockRowAdditionalLeadingControls[0].id)).toBeVisible();
      expect(
        screen.queryByTestId('unifiedDataTable_additionalRowControl_actionsMenu')
      ).not.toBeInTheDocument();
    });
  });

  it('clamps visibleRowLeadingControls <= 1 to 2', () => {
    const mocks = [
      mockRowAdditionalLeadingControls[0],
      mockRowAdditionalLeadingControls[1],
      mockRowAdditionalLeadingControls[2],
    ];

    const { columns } = getAdditionalRowControlColumns(mocks, 0);

    // With totalVisible clamped to 2 and n=3 (n > 2), expect 1 inline + 1 menu = 2 columns
    expect(columns).toHaveLength(2);
  });
});
