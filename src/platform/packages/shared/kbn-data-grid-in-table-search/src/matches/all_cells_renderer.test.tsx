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
import { AllCellsRenderer } from './all_cells_renderer';
import { getRenderCellValueMock, generateMockData } from '../__mocks__';
import { wrapRenderCellValueWithInTableSearchSupport } from '../wrap_render_cell_value';

describe('AllCellsRenderer', () => {
  const testData = generateMockData(100, 2);

  const originalRenderCellValue = jest.fn(getRenderCellValueMock(testData));
  const getRenderCellValueWrappedMock = () =>
    jest.fn(wrapRenderCellValueWithInTableSearchSupport(originalRenderCellValue, 'black', 'green'));

  beforeEach(() => {
    originalRenderCellValue.mockClear();
  });

  it('processes all cells in all rows', async () => {
    const onFinish = jest.fn();
    const renderCellValue = getRenderCellValueWrappedMock();
    const visibleColumns = ['columnA', 'columnB'];
    const inTableSearchTerm = 'cell';

    render(
      <AllCellsRenderer
        rowsCount={testData.length}
        inTableSearchTerm={inTableSearchTerm}
        visibleColumns={visibleColumns}
        renderCellValue={renderCellValue}
        onFinish={onFinish}
      />
    );

    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith({
        matchesList: testData.map((rowData, rowIndex) => ({
          rowIndex,
          rowMatchesCount: 2,
          matchesCountPerColumnId: { columnA: 1, columnB: 1 },
        })),
        totalMatchesCount: testData.length * 2, // 1 match in each cell
      });
    });
  });

  it('counts multiple matches correctly', async () => {
    const onFinish = jest.fn();
    const renderCellValue = getRenderCellValueWrappedMock();
    const visibleColumns = ['columnA', 'columnB'];
    const inTableSearchTerm = '-';

    render(
      <AllCellsRenderer
        rowsCount={testData.length}
        inTableSearchTerm={inTableSearchTerm}
        visibleColumns={visibleColumns}
        renderCellValue={renderCellValue}
        onFinish={onFinish}
      />
    );

    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith({
        matchesList: testData.map((rowData, rowIndex) => ({
          rowIndex,
          rowMatchesCount: 10,
          matchesCountPerColumnId: { columnA: 5, columnB: 5 },
        })),
        totalMatchesCount: testData.length * 5 * 2, // 5 matches per cell, 2 cells in a row
      });
    });
  });

  it('counts a single match correctly', async () => {
    const onFinish = jest.fn();
    const renderCellValue = getRenderCellValueWrappedMock();
    const visibleColumns = ['columnA', 'columnB'];
    const inTableSearchTerm = 'cell-in-row-10-col-0';

    render(
      <AllCellsRenderer
        rowsCount={testData.length}
        inTableSearchTerm={inTableSearchTerm}
        visibleColumns={visibleColumns}
        renderCellValue={renderCellValue}
        onFinish={onFinish}
      />
    );

    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith({
        matchesList: testData
          .map((rowData, rowIndex) => {
            if (!rowData[0].startsWith(inTableSearchTerm)) {
              return;
            }

            return {
              rowIndex,
              rowMatchesCount: 1,
              matchesCountPerColumnId: { columnA: 1 },
            };
          })
          .filter(Boolean),
        totalMatchesCount: 1,
      });
    });
  });

  it('skips cells which create exceptions', async () => {
    const onFinish = jest.fn();
    const renderCellValue = getRenderCellValueWrappedMock();
    const visibleColumns = ['columnA', 'columnB'];
    const inTableSearchTerm = '50';

    render(
      <AllCellsRenderer
        rowsCount={testData.length + 5} // 5 extra rows which trigger exceptions
        inTableSearchTerm={inTableSearchTerm}
        visibleColumns={visibleColumns}
        renderCellValue={renderCellValue}
        onFinish={onFinish}
      />
    );

    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith({
        matchesList: [
          {
            rowIndex: 50,
            rowMatchesCount: 2,
            matchesCountPerColumnId: { columnA: 1, columnB: 1 },
          },
        ],
        totalMatchesCount: 2,
      });
    });
  });
});
