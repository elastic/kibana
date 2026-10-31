/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createRef } from 'react';
import { fireEvent, render, screen, waitFor, renderHook, within } from '@testing-library/react';
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
import type { RenderCellValuePropsWithInTableSearch } from './types';

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

  it('should use the provided scrollToCell override when navigating matches', async () => {
    const scrollToCell = jest.fn();

    render(
      <DataGridWithInTableSearchExample
        rowsCount={100}
        columnsCount={2}
        pageSize={null}
        scrollToCell={scrollToCell}
      />
    );

    screen.getByTestId(BUTTON_TEST_SUBJ).click();

    await waitFor(() => {
      expect(screen.getByTestId(INPUT_TEST_SUBJ)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId(INPUT_TEST_SUBJ), { target: { value: 'row-1' } });

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/22');
    });

    await waitFor(() => {
      expect(scrollToCell).toHaveBeenCalledWith(
        expect.objectContaining({ rowIndex: expect.any(Number), align: 'center' })
      );
    });

    scrollToCell.mockClear();
    screen.getByTestId(BUTTON_PREV_TEST_SUBJ).click();

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('22/22');
    });

    await waitFor(() => {
      expect(scrollToCell).toHaveBeenCalledWith(
        expect.objectContaining({ rowIndex: expect.any(Number), align: 'center' })
      );
    });
  });

  it.each(['ctrlKey', 'metaKey'] as const)(
    'scopes %s+F to the grid and its current external hosts',
    async (modifier) => {
      const externalControls = render(
        <div>
          <div data-test-subj="externalHeader">
            <button>Toolbar control</button>
            <button>Column header</button>
          </div>
          <button>Unrelated control</button>
        </div>
      );
      const externalHeader = externalControls.getByTestId('externalHeader');
      const view = render(
        <DataGridWithInTableSearchExample
          rowsCount={2}
          columnsCount={2}
          pageSize={null}
          additionalSearchScopeElements={[externalHeader]}
        />
      );
      const otherGrid = render(
        <DataGridWithInTableSearchExample rowsCount={2} columnsCount={2} pageSize={null} />
      );
      const gridQueries = within(view.container);
      const otherGridQueries = within(otherGrid.container);
      const shortcut = { key: 'f', [modifier]: true };

      expect(fireEvent.keyDown(externalControls.getByText('Unrelated control'), shortcut)).toBe(
        true
      );
      expect(gridQueries.queryByTestId(INPUT_TEST_SUBJ)).not.toBeInTheDocument();

      for (const label of ['Toolbar control', 'Column header']) {
        expect(fireEvent.keyDown(externalControls.getByText(label), shortcut)).toBe(false);
        const input = await gridQueries.findByTestId(INPUT_TEST_SUBJ);
        expect(input).toHaveFocus();
        expect(otherGridQueries.queryByTestId(INPUT_TEST_SUBJ)).not.toBeInTheDocument();
        expect(fireEvent.keyDown(externalControls.getByText(label), shortcut)).toBe(false);
        expect(input).toHaveFocus();
        fireEvent.keyUp(input, { key: 'Escape' });
        await waitFor(() =>
          expect(gridQueries.queryByTestId(INPUT_TEST_SUBJ)).not.toBeInTheDocument()
        );
      }

      view.rerender(
        <DataGridWithInTableSearchExample rowsCount={2} columnsCount={2} pageSize={null} />
      );
      expect(fireEvent.keyDown(externalControls.getByText('Toolbar control'), shortcut)).toBe(true);
      expect(gridQueries.queryByTestId(INPUT_TEST_SUBJ)).not.toBeInTheDocument();

      expect(fireEvent.keyDown(gridQueries.getByTestId(BUTTON_TEST_SUBJ), shortcut)).toBe(false);
      expect(await gridQueries.findByTestId(INPUT_TEST_SUBJ)).toHaveFocus();
      expect(otherGridQueries.queryByTestId(INPUT_TEST_SUBJ)).not.toBeInTheDocument();
    }
  );

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

  it('should initialize correctly when initial state is provided', async () => {
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
      initialState: {
        searchTerm: 'initial search term',
      },
    };
    const { result } = renderHook((props) => useDataGridInTableSearch(props), {
      initialProps,
    });

    const { inTableSearchTermCss, inTableSearchControl, cellContextWithInTableSearchSupport } =
      result.current;

    expect(inTableSearchControl).toBeDefined();
    expect(inTableSearchTermCss).toBeUndefined();
    expect(cellContextWithInTableSearchSupport).toEqual({
      ...originalCellContext,
      inTableSearchTerm: 'initial search term',
    });
  });
});
