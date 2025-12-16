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
import { render, screen } from '@testing-library/react';
import React from 'react';
import { UnifiedDataTableContext } from '../../../table_context';
import { dataTableContextComplexMock } from '../../../../__mocks__/table_context';
import { userEvent } from '@testing-library/user-event';
import type { RowControlColumn } from '@kbn/discover-utils';

const setup = (rowControlColumns: RowControlColumn[]) => {
  const { columns } = getAdditionalRowControlColumns(rowControlColumns);

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
    expect(screen.getByTestId(mocks[1].id)).toBeVisible();
    expect(screen.getByTestId(mocks[2].id)).toBeVisible();
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
});
