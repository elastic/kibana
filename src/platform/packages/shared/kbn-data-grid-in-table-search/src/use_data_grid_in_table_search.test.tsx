/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createRef } from 'react';
import { fireEvent, render, screen, waitFor, renderHook } from '@testing-library/react';
import {
  DataGridWithInTableSearchExample,
  generateMockData,
  getRenderCellValueMock,
  MockContext,
} from './__mocks__';
import { useDataGridInTableSearch } from './use_data_grid_in_table_search';
import {
  BUTTON_TEST_SUBJ,
  INPUT_TEST_SUBJ,
  COUNTER_TEST_SUBJ,
  HIGHLIGHT_CLASS_NAME,
  BUTTON_PREV_TEST_SUBJ,
} from './constants';
import { RenderCellValuePropsWithInTableSearch } from './types';

describe('useDataGridInTableSearch', () => {
  const testData = generateMockData(100, 2);

  it('should initialize correctly', async () => {
    const originalRenderCellValue = getRenderCellValueMock(testData);
    const originalCellContext = { testContext: true };
    const initialProps = {
      dataGridWrapper: null,
      dataGridRef: createRef<null>(),
      visibleColumns: ['columnA', 'columnB'],
      rows: testData,
      cellContext: originalCellContext,
      renderCellValue: originalRenderCellValue,
      pagination: undefined,
    };
    const { result } = renderHook((props) => useDataGridInTableSearch(props), {
      initialProps,
    });

    const {
      inTableSearchTermCss,
      inTableSearchControl,
      cellContextWithInTableSearchSupport,
      renderCellValueWithInTableSearchSupport,
    } = result.current;

    expect(inTableSearchControl).toBeDefined();
    expect(inTableSearchTermCss).toBeUndefined();
    expect(cellContextWithInTableSearchSupport).toEqual({
      ...originalCellContext,
      inTableSearchTerm: '',
    });
    expect(
      renderCellValueWithInTableSearchSupport({
        rowIndex: 0,
        colIndex: 0,
        inTableSearchTerm: 'test',
      } as RenderCellValuePropsWithInTableSearch)
    ).toMatchInlineSnapshot(`
      <InTableSearchHighlightsWrapper
        highlightBackgroundColor="#FDDDE9"
        highlightColor="#A11262"
        inTableSearchTerm="test"
      >
        <OriginalRenderCellValue
          colIndex={0}
          rowIndex={0}
        />
      </InTableSearchHighlightsWrapper>
    `);

    render(inTableSearchControl);

    await waitFor(() => {
      expect(screen.getByTestId(BUTTON_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  it('should render an EuiDataGrid with in table search support', async () => {
    render(<DataGridWithInTableSearchExample rowsCount={100} columnsCount={5} pageSize={10} />);

    screen.getByTestId(BUTTON_TEST_SUBJ).click();

    await waitFor(() => {
      expect(screen.getByTestId(INPUT_TEST_SUBJ)).toBeInTheDocument();
    });

    const searchTerm = 'col-0';
    let input = screen.getByTestId(INPUT_TEST_SUBJ);
    fireEvent.change(input, { target: { value: searchTerm } });
    expect(input).toHaveValue(searchTerm);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/100');
    });

    await waitFor(() => {
      const highlights = screen.getAllByText(searchTerm);
      expect(highlights.length).toBeGreaterThan(0);
      expect(
        highlights.every(
          (highlight) =>
            highlight.tagName === 'MARK' && highlight.classList.contains(HIGHLIGHT_CLASS_NAME)
        )
      ).toBe(true);
    });

    screen.getByTestId(BUTTON_PREV_TEST_SUBJ).click();

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('100/100');
    });

    const searchTerm2 = 'row-1';
    input = screen.getByTestId(INPUT_TEST_SUBJ);
    fireEvent.change(input, { target: { value: searchTerm2 } });
    expect(input).toHaveValue(searchTerm2);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/55');
    });

    await waitFor(() => {
      const highlights = screen.getAllByText(searchTerm2);
      expect(highlights.length).toBeGreaterThan(0);
      expect(
        highlights.every(
          (highlight) =>
            highlight.tagName === 'MARK' && highlight.classList.contains(HIGHLIGHT_CLASS_NAME)
        )
      ).toBe(true);
    });
  });

  it('should handle parent contexts correctly', async () => {
    render(
      <MockContext.Provider value={{ mockContextValue: 'test access to any parent context' }}>
        <DataGridWithInTableSearchExample rowsCount={100} columnsCount={2} pageSize={null} />
      </MockContext.Provider>
    );

    screen.getByTestId(BUTTON_TEST_SUBJ).click();

    await waitFor(() => {
      expect(screen.getByTestId(INPUT_TEST_SUBJ)).toBeInTheDocument();
    });

    const searchTerm = 'test access';
    const input = screen.getByTestId(INPUT_TEST_SUBJ);
    fireEvent.change(input, { target: { value: searchTerm } });
    expect(input).toHaveValue(searchTerm);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/200');
    });
  });
});
