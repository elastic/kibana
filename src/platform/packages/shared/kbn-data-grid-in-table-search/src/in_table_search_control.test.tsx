/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { InTableSearchControl, InTableSearchControlProps } from './in_table_search_control';
import {
  CELL_MATCH_INDEX_ATTRIBUTE,
  COUNTER_TEST_SUBJ,
  HIGHLIGHT_CLASS_NAME,
  BUTTON_NEXT_TEST_SUBJ,
} from './constants';
import { wrapRenderCellValueWithInTableSearchSupport } from './wrap_render_cell_value';
import { getRenderCellValueMock } from './__mocks__';

describe('InTableSearchControl', () => {
  const testData = [
    ['aaaa', '100'],
    ['bbb', 'abb'],
    ['abc', 'aaac'],
  ];

  const testData2 = [
    ['bb', 'cc'],
    ['bc', 'caa'],
  ];

  const visibleColumns = Array.from({ length: 2 }, (_, i) => `column${i}`);
  const getColumnIndexFromId = (columnId: string) => parseInt(columnId.replace('column', ''), 10);

  const getRenderCellValueWrappedMock = (data: string[][]) =>
    jest.fn(
      wrapRenderCellValueWithInTableSearchSupport(getRenderCellValueMock(data), 'black', 'green')
    );

  it('should update correctly when deps change', async () => {
    const initialProps: InTableSearchControlProps = {
      inTableSearchTerm: 'a',
      pageSize: 10,
      visibleColumns,
      rows: testData,
      renderCellValue: getRenderCellValueWrappedMock(testData),
      getColumnIndexFromId: jest.fn(getColumnIndexFromId),
      scrollToCell: jest.fn(),
      shouldOverrideCmdF: jest.fn(),
      onChange: jest.fn(),
      onChangeCss: jest.fn(),
      onChangeToExpectedPage: jest.fn(),
    };

    const { rerender } = render(<InTableSearchControl {...initialProps} />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/9');
    });

    await waitFor(() => {
      expect(initialProps.onChangeToExpectedPage).toHaveBeenCalledWith(0);
    });

    expect(initialProps.getColumnIndexFromId).toHaveBeenCalledWith('column0');
    expect(initialProps.scrollToCell).toHaveBeenCalledWith({
      align: 'center',
      columnIndex: 0,
      rowIndex: 0,
    });
    expect(initialProps.onChange).not.toHaveBeenCalled();
    expect(initialProps.onChangeCss).toHaveBeenCalledWith(
      expect.objectContaining({
        styles: expect.stringContaining(
          "[data-gridcell-row-index='0'][data-gridcell-column-id='column0']"
        ),
      })
    );
    expect(initialProps.onChangeCss).toHaveBeenLastCalledWith(
      expect.objectContaining({
        styles: expect.stringContaining(
          `.${HIGHLIGHT_CLASS_NAME}[${CELL_MATCH_INDEX_ATTRIBUTE}='0']`
        ),
      })
    );

    rerender(
      <InTableSearchControl
        {...initialProps}
        rows={testData2}
        renderCellValue={getRenderCellValueWrappedMock(testData2)}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/2');
    });

    await waitFor(() => {
      expect(initialProps.onChangeToExpectedPage).toHaveBeenNthCalledWith(2, 0);
    });

    expect(initialProps.getColumnIndexFromId).toHaveBeenLastCalledWith('column1');
    expect(initialProps.scrollToCell).toHaveBeenLastCalledWith({
      align: 'center',
      columnIndex: 1,
      rowIndex: 1,
    });
    expect(initialProps.onChange).not.toHaveBeenCalled();
    expect(initialProps.onChangeCss).toHaveBeenLastCalledWith(
      expect.objectContaining({
        styles: expect.stringContaining(
          "[data-gridcell-row-index='1'][data-gridcell-column-id='column1']"
        ),
      })
    );
    expect(initialProps.onChangeCss).toHaveBeenLastCalledWith(
      expect.objectContaining({
        styles: expect.stringContaining(
          `.${HIGHLIGHT_CLASS_NAME}[${CELL_MATCH_INDEX_ATTRIBUTE}='0']`
        ),
      })
    );
  });

  it('should update correctly when search term changes', async () => {
    const initialProps: InTableSearchControlProps = {
      inTableSearchTerm: 'aa',
      pageSize: null,
      visibleColumns,
      rows: testData,
      renderCellValue: getRenderCellValueWrappedMock(testData),
      getColumnIndexFromId: jest.fn(getColumnIndexFromId),
      scrollToCell: jest.fn(),
      shouldOverrideCmdF: jest.fn(),
      onChange: jest.fn(),
      onChangeCss: jest.fn(),
      onChangeToExpectedPage: jest.fn(),
    };

    const { rerender } = render(<InTableSearchControl {...initialProps} />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/3');
    });

    rerender(<InTableSearchControl {...initialProps} inTableSearchTerm="b" />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/6');
    });
  });

  it('should change pages correctly', async () => {
    const initialProps: InTableSearchControlProps = {
      inTableSearchTerm: 'abc',
      pageSize: 2,
      visibleColumns,
      rows: testData,
      renderCellValue: getRenderCellValueWrappedMock(testData),
      getColumnIndexFromId: jest.fn(getColumnIndexFromId),
      scrollToCell: jest.fn(),
      shouldOverrideCmdF: jest.fn(),
      onChange: jest.fn(),
      onChangeCss: jest.fn(),
      onChangeToExpectedPage: jest.fn(),
    };

    const { rerender } = render(<InTableSearchControl {...initialProps} />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/1');
    });

    expect(initialProps.onChangeToExpectedPage).toHaveBeenCalledWith(1);

    rerender(<InTableSearchControl {...initialProps} inTableSearchTerm="c" pageSize={1} />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/2');
    });

    expect(initialProps.onChangeToExpectedPage).toHaveBeenNthCalledWith(2, 2);

    rerender(<InTableSearchControl {...initialProps} inTableSearchTerm="100" />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/1');
    });

    expect(initialProps.onChangeToExpectedPage).toHaveBeenNthCalledWith(3, 0);

    rerender(<InTableSearchControl {...initialProps} inTableSearchTerm="random" />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('0/0');
    });

    rerender(<InTableSearchControl {...initialProps} inTableSearchTerm="100" pageSize={null} />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/1');
    });

    expect(initialProps.onChangeToExpectedPage).toHaveBeenCalledTimes(3);
  });

  it('should highlight the active match correctly', async () => {
    const initialProps: InTableSearchControlProps = {
      inTableSearchTerm: 'aa',
      pageSize: 2,
      visibleColumns,
      rows: testData,
      renderCellValue: getRenderCellValueWrappedMock(testData),
      getColumnIndexFromId: jest.fn(getColumnIndexFromId),
      scrollToCell: jest.fn(),
      shouldOverrideCmdF: jest.fn(),
      onChange: jest.fn(),
      onChangeCss: jest.fn(),
      onChangeToExpectedPage: jest.fn(),
    };

    render(<InTableSearchControl {...initialProps} />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/3');
    });

    await waitFor(() => {
      expect(initialProps.onChangeToExpectedPage).toHaveBeenCalledWith(0);
    });

    expect(initialProps.scrollToCell).toHaveBeenCalledWith({
      align: 'center',
      columnIndex: 0,
      rowIndex: 0,
    });
    expect(initialProps.onChangeCss).toHaveBeenCalledWith(
      expect.objectContaining({
        styles: expect.stringContaining(
          "[data-gridcell-row-index='0'][data-gridcell-column-id='column0']"
        ),
      })
    );
    expect(initialProps.onChangeCss).toHaveBeenLastCalledWith(
      expect.objectContaining({
        styles: expect.stringContaining(
          `.${HIGHLIGHT_CLASS_NAME}[${CELL_MATCH_INDEX_ATTRIBUTE}='0']`
        ),
      })
    );

    screen.getByTestId(BUTTON_NEXT_TEST_SUBJ).click();

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('2/3');
    });

    await waitFor(() => {
      expect(initialProps.onChangeToExpectedPage).toHaveBeenNthCalledWith(2, 0);
    });

    expect(initialProps.scrollToCell).toHaveBeenNthCalledWith(2, {
      align: 'center',
      columnIndex: 0,
      rowIndex: 0,
    });
    expect(initialProps.onChangeCss).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        styles: expect.stringContaining(
          "[data-gridcell-row-index='0'][data-gridcell-column-id='column0']"
        ),
      })
    );
    expect(initialProps.onChangeCss).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        styles: expect.stringContaining(
          `.${HIGHLIGHT_CLASS_NAME}[${CELL_MATCH_INDEX_ATTRIBUTE}='1']`
        ),
      })
    );

    screen.getByTestId(BUTTON_NEXT_TEST_SUBJ).click();

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('3/3');
    });

    await waitFor(() => {
      expect(initialProps.onChangeToExpectedPage).toHaveBeenNthCalledWith(3, 1);
    });

    expect(initialProps.scrollToCell).toHaveBeenNthCalledWith(3, {
      align: 'center',
      columnIndex: 1,
      rowIndex: 0,
    });
    expect(initialProps.onChangeCss).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        styles: expect.stringContaining(
          "[data-gridcell-row-index='2'][data-gridcell-column-id='column1']"
        ),
      })
    );
    expect(initialProps.onChangeCss).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        styles: expect.stringContaining(
          `.${HIGHLIGHT_CLASS_NAME}[${CELL_MATCH_INDEX_ATTRIBUTE}='0']`
        ),
      })
    );
  });

  it('should handle timeouts', async () => {
    const initialProps: InTableSearchControlProps = {
      inTableSearchTerm: 'aa',
      pageSize: null,
      visibleColumns,
      rows: testData,
      renderCellValue: getRenderCellValueWrappedMock(testData),
      getColumnIndexFromId: jest.fn(getColumnIndexFromId),
      scrollToCell: jest.fn(),
      shouldOverrideCmdF: jest.fn(),
      onChange: jest.fn(),
      onChangeCss: jest.fn(),
      onChangeToExpectedPage: jest.fn(),
    };

    const { rerender } = render(<InTableSearchControl {...initialProps} />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/3');
    });

    rerender(<InTableSearchControl {...initialProps} renderCellValue={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('0/0');
    });
  });

  it('should handle ignore errors in cells', async () => {
    const initialProps: InTableSearchControlProps = {
      inTableSearchTerm: 'aa',
      pageSize: null,
      visibleColumns: [visibleColumns[0]],
      rows: testData,
      renderCellValue: getRenderCellValueWrappedMock(testData),
      getColumnIndexFromId: jest.fn(getColumnIndexFromId),
      scrollToCell: jest.fn(),
      shouldOverrideCmdF: jest.fn(),
      onChange: jest.fn(),
      onChangeCss: jest.fn(),
      onChangeToExpectedPage: jest.fn(),
    };

    const { rerender } = render(<InTableSearchControl {...initialProps} />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/2');
    });

    rerender(
      <InTableSearchControl {...initialProps} visibleColumns={[...visibleColumns, 'extraColumn']} />
    );

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/3');
    });
  });
});
