/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { RowCellsRenderer } from './row_cells_renderer';
import { wrapRenderCellValueWithInTableSearchSupport } from '../wrap_render_cell_value';
import { getRenderCellValueMock } from '../__mocks__';

describe('RowCellsRenderer', () => {
  const testData = [
    ['aaa', '100'],
    ['bbb', 'abb'],
  ];

  const originalRenderCellValue = jest.fn(getRenderCellValueMock(testData));

  const getRenderCellValueWrappedMock = () =>
    jest.fn(wrapRenderCellValueWithInTableSearchSupport(originalRenderCellValue, 'black', 'green'));

  beforeEach(() => {
    originalRenderCellValue.mockClear();
  });

  it('renders cells in row 0', async () => {
    const onRowProcessed = jest.fn();
    const renderCellValue = getRenderCellValueWrappedMock();
    const visibleColumns = ['columnA', 'columnB'];
    const rowIndex = 0;
    const inTableSearchTerm = 'a';

    render(
      <RowCellsRenderer
        rowIndex={rowIndex}
        inTableSearchTerm={inTableSearchTerm}
        visibleColumns={visibleColumns}
        renderCellValue={renderCellValue}
        onRowProcessed={onRowProcessed}
      />
    );

    await waitFor(() => {
      expect(onRowProcessed).toHaveBeenCalledWith({
        rowIndex: 0,
        rowMatchesCount: 3,
        matchesCountPerColumnId: {
          columnA: 3,
        },
      });
    });

    expect(renderCellValue).toHaveBeenCalledTimes(2);
    expect(originalRenderCellValue).toHaveBeenCalledTimes(2);
    expect(onRowProcessed).toHaveBeenCalledTimes(1);
  });

  it('renders cells in row 1', async () => {
    const onRowProcessed = jest.fn();
    const renderCellValue = getRenderCellValueWrappedMock();
    const visibleColumns = ['columnA', 'columnB'];
    const rowIndex = 1;
    const inTableSearchTerm = 'bb';

    render(
      <RowCellsRenderer
        rowIndex={rowIndex}
        inTableSearchTerm={inTableSearchTerm}
        visibleColumns={visibleColumns}
        renderCellValue={renderCellValue}
        onRowProcessed={onRowProcessed}
      />
    );

    await waitFor(() => {
      expect(onRowProcessed).toHaveBeenCalledWith({
        rowIndex: 1,
        rowMatchesCount: 2,
        matchesCountPerColumnId: {
          columnA: 1,
          columnB: 1,
        },
      });
    });

    expect(renderCellValue).toHaveBeenCalledTimes(2);
    expect(originalRenderCellValue).toHaveBeenCalledTimes(2);
    expect(onRowProcessed).toHaveBeenCalledTimes(1);
  });

  it('should call onRowProcessed even in case of errors', async () => {
    const onRowProcessed = jest.fn();
    const renderCellValue = getRenderCellValueWrappedMock();
    const visibleColumns = ['columnA', 'columnB'];
    const rowIndex = 3;
    const inTableSearchTerm = 'test';

    render(
      <RowCellsRenderer
        rowIndex={rowIndex}
        inTableSearchTerm={inTableSearchTerm}
        visibleColumns={visibleColumns}
        renderCellValue={renderCellValue}
        onRowProcessed={onRowProcessed}
      />
    );

    await waitFor(() => {
      expect(onRowProcessed).toHaveBeenCalledWith({
        rowIndex: 3,
        rowMatchesCount: 0,
        matchesCountPerColumnId: {},
      });
    });

    expect(onRowProcessed).toHaveBeenCalledTimes(1);
  });
});
