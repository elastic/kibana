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
import { CELL_MATCH_INDEX_ATTRIBUTE, COUNTER_TEST_SUBJ, HIGHLIGHT_CLASS_NAME } from './constants';
import { wrapRenderCellValueWithInTableSearchSupport } from './wrap_render_cell_value';
import { getRenderCellValueMock } from './__mocks__';

describe('InTableSearchControl', () => {
  const testData = [
    ['aaa', '100'],
    ['bbb', 'abb'],
    ['abc', 'aaa'],
  ];

  const testData2 = [
    ['bb', 'cc'],
    ['bc', 'caa'],
  ];

  it('should update correctly when deps change', async () => {
    const initialProps: InTableSearchControlProps = {
      inTableSearchTerm: 'a',
      pageSize: 10,
      visibleColumns: Array.from({ length: 2 }, (_, i) => `column${i}`),
      rows: testData,
      renderCellValue: jest.fn(
        wrapRenderCellValueWithInTableSearchSupport(getRenderCellValueMock(testData))
      ),
      getColumnIndexFromId: jest.fn((columnId) => parseInt(columnId.replace('column', ''), 10)),
      scrollToCell: jest.fn(),
      shouldOverrideCmdF: jest.fn(),
      onChange: jest.fn(),
      onChangeCss: jest.fn(),
      onChangeToExpectedPage: jest.fn(),
    };

    const { rerender } = render(<InTableSearchControl {...initialProps} />);

    await waitFor(() => {
      expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/8');
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
        renderCellValue={jest.fn(
          wrapRenderCellValueWithInTableSearchSupport(getRenderCellValueMock(testData2))
        )}
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
});
