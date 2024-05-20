/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridCellValueElementProps, EuiDataGridSetCellProps } from '@elastic/eui';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { ReactNode, useState } from 'react';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { useComparisonCellValue, UseComparisonCellValueProps } from './use_comparison_cell_value';
import { CELL_CLASS } from '../../../utils/get_render_cell_value';
import {
  ADDED_SEGMENT_CLASS,
  BASE_CELL_CLASS,
  DIFF_CELL_CLASS,
  FIELD_NAME_CLASS,
  MATCH_CELL_CLASS,
  REMOVED_SEGMENT_CLASS,
  SEGMENT_CLASS,
} from './use_comparison_css';
import * as CalculateDiff from './calculate_diff';

const calculateDiff = jest.spyOn(CalculateDiff, 'calculateDiff');

const docs = generateEsHits(dataViewWithTimefieldMock, 3).map((hit, i) => {
  switch (i) {
    case 0:
    case 2:
      hit.fields!.message = ['This is a message val'];
      hit.fields!.extension = ['gif', 'png'];
      break;
    case 1:
      hit.fields!.message = ['This one is a different msg value'];
      hit.fields!.extension = ['png', 'jpg'];
      break;
  }

  return buildDataTableRecord(hit, dataViewWithTimefieldMock);
});

const getDocById = (id: string) => docs.find((doc) => doc.raw._id === id);

const fieldColumnId = 'fieldColumnId';

const renderComparisonCellValue = (props: Partial<UseComparisonCellValueProps> = {}) => {
  const defaultProps: UseComparisonCellValueProps = {
    dataView: dataViewWithTimefieldMock,
    comparisonFields: ['message', 'extension', 'bytes'],
    fieldColumnId,
    selectedDocs: ['0', '1', '2'],
    diffMode: undefined,
    fieldFormats: fieldFormatsMock,
    getDocById,
    ...props,
  };
  const hook = renderHook((currentProps) => useComparisonCellValue(currentProps), {
    initialProps: defaultProps,
  });
  return {
    rerender: (newProps: Partial<UseComparisonCellValueProps>) => {
      hook.rerender({ ...defaultProps, ...newProps });
    },
    renderCellValue: (cellValueProps: EuiDataGridCellValueElementProps) => {
      return hook.result.current(cellValueProps);
    },
  };
};

const ComparisonCell = ({
  columnId,
  colIndex,
  rowIndex,
  renderCellValue,
}: {
  columnId: string;
  colIndex: number;
  rowIndex: number;
  renderCellValue: (innerProps: EuiDataGridCellValueElementProps) => ReactNode;
}) => {
  const [cellProps, setCellProps] = useState<EuiDataGridSetCellProps>();
  return (
    <div {...cellProps} data-test-subj={`${columnId}_${colIndex}_${rowIndex}`}>
      {renderCellValue({
        columnId,
        colIndex,
        rowIndex,
        isExpandable: false,
        isExpanded: false,
        isDetails: false,
        setCellProps,
      })}
    </div>
  );
};

const renderComparisonCell = ({
  columnId,
  colIndex,
  rowIndex,
  renderCellValue,
}: Parameters<typeof ComparisonCell>[0]) => {
  render(
    <ComparisonCell
      columnId={columnId}
      colIndex={colIndex}
      rowIndex={rowIndex}
      renderCellValue={renderCellValue}
    />
  );
  const getCell = () => screen.getByTestId(`${columnId}_${colIndex}_${rowIndex}`);
  return {
    getCell,
    getCellValue: () => getCell().querySelector(`.${CELL_CLASS}`),
    getAllSegments: () => getCell().querySelectorAll(`.${SEGMENT_CLASS}`),
    getAddedSegments: () => getCell().querySelectorAll(`.${ADDED_SEGMENT_CLASS}`),
    getRemovedSegments: () => getCell().querySelectorAll(`.${REMOVED_SEGMENT_CLASS}`),
  };
};

describe('useComparisonCellValue', () => {
  it('should render field cells', () => {
    const { renderCellValue } = renderComparisonCellValue();
    const messageCell = renderComparisonCell({
      columnId: fieldColumnId,
      colIndex: 0,
      rowIndex: 0,
      renderCellValue,
    });
    const messageElement = screen.getByText('message');
    expect(messageElement).toBeInTheDocument();
    expect(messageElement).toHaveClass(FIELD_NAME_CLASS);
    expect(messageCell.getCell()).toMatchSnapshot();
    const extensionCell = renderComparisonCell({
      columnId: fieldColumnId,
      colIndex: 0,
      rowIndex: 1,
      renderCellValue,
    });
    const extensionElement = screen.getByText('extension');
    expect(extensionElement).toBeInTheDocument();
    expect(extensionElement).toHaveClass(FIELD_NAME_CLASS);
    expect(extensionCell.getCell()).toMatchSnapshot();
    const bytesCell = renderComparisonCell({
      columnId: fieldColumnId,
      colIndex: 0,
      rowIndex: 2,
      renderCellValue,
    });
    const bytesElement = screen.getByText('bytes');
    expect(bytesElement).toBeInTheDocument();
    expect(bytesElement).toHaveClass(FIELD_NAME_CLASS);
    expect(bytesCell.getCell()).toMatchSnapshot();
  });

  it('should render exmpty cell if doc is not found', () => {
    const { renderCellValue } = renderComparisonCellValue();
    const emptyCell = renderComparisonCell({
      columnId: 'unknown',
      colIndex: 1,
      rowIndex: 0,
      renderCellValue,
    });
    expect(emptyCell.getCellValue()).toBeInTheDocument();
    expect(emptyCell.getCell()).toMatchSnapshot();
  });

  it('should render cells with no diff mode', () => {
    const { renderCellValue } = renderComparisonCellValue();
    const baseCell = renderComparisonCell({
      columnId: '0',
      colIndex: 1,
      rowIndex: 0,
      renderCellValue,
    });
    expect(baseCell.getCellValue()).toBeInTheDocument();
    expect(baseCell.getCell()).toHaveClass(BASE_CELL_CLASS);
    expect(baseCell.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(baseCell.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(baseCell.getAllSegments()).toHaveLength(0);
    expect(baseCell.getCell()).toMatchSnapshot();
    const comparisonCell1 = renderComparisonCell({
      columnId: '1',
      colIndex: 2,
      rowIndex: 0,
      renderCellValue,
    });
    expect(comparisonCell1.getCellValue()).toBeInTheDocument();
    expect(comparisonCell1.getCell()).not.toHaveClass(BASE_CELL_CLASS);
    expect(comparisonCell1.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(comparisonCell1.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(comparisonCell1.getAllSegments()).toHaveLength(0);
    expect(comparisonCell1.getCell()).toMatchSnapshot();
    const comparisonCell2 = renderComparisonCell({
      columnId: '2',
      colIndex: 3,
      rowIndex: 0,
      renderCellValue,
    });
    expect(comparisonCell2.getCellValue()).toBeInTheDocument();
    expect(comparisonCell2.getCell()).not.toHaveClass(BASE_CELL_CLASS);
    expect(comparisonCell2.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(comparisonCell2.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(comparisonCell2.getAllSegments()).toHaveLength(0);
    expect(comparisonCell2.getCell()).toMatchSnapshot();
  });

  it('should render cells with diff mode "Full value"', () => {
    const { renderCellValue } = renderComparisonCellValue({ diffMode: 'basic' });
    const baseCell = renderComparisonCell({
      columnId: '0',
      colIndex: 1,
      rowIndex: 0,
      renderCellValue,
    });
    expect(baseCell.getCellValue()).toBeInTheDocument();
    expect(baseCell.getCell()).toHaveClass(BASE_CELL_CLASS);
    expect(baseCell.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(baseCell.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(baseCell.getAllSegments()).toHaveLength(0);
    expect(baseCell.getCell()).toMatchSnapshot();
    const comparisonCell1 = renderComparisonCell({
      columnId: '1',
      colIndex: 2,
      rowIndex: 0,
      renderCellValue,
    });
    expect(comparisonCell1.getCellValue()).toBeInTheDocument();
    expect(comparisonCell1.getCell()).not.toHaveClass(BASE_CELL_CLASS);
    expect(comparisonCell1.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(comparisonCell1.getCell()).toHaveClass(DIFF_CELL_CLASS);
    expect(comparisonCell1.getAllSegments()).toHaveLength(0);
    expect(comparisonCell1.getCell()).toMatchSnapshot();
    const comparisonCell2 = renderComparisonCell({
      columnId: '2',
      colIndex: 3,
      rowIndex: 0,
      renderCellValue,
    });
    expect(comparisonCell2.getCellValue()).toBeInTheDocument();
    expect(comparisonCell2.getCell()).not.toHaveClass(BASE_CELL_CLASS);
    expect(comparisonCell2.getCell()).toHaveClass(MATCH_CELL_CLASS);
    expect(comparisonCell2.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(comparisonCell2.getAllSegments()).toHaveLength(0);
    expect(comparisonCell2.getCell()).toMatchSnapshot();
  });

  it('should render cells with diff mode "Chars"', () => {
    const { renderCellValue } = renderComparisonCellValue({ diffMode: 'chars' });
    const baseCell = renderComparisonCell({
      columnId: '0',
      colIndex: 1,
      rowIndex: 0,
      renderCellValue,
    });
    expect(baseCell.getCellValue()).toBeInTheDocument();
    expect(baseCell.getCell()).toHaveClass(BASE_CELL_CLASS);
    expect(baseCell.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(baseCell.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(baseCell.getAllSegments()).toHaveLength(0);
    expect(baseCell.getCell()).toMatchSnapshot();
    const comparisonCell1 = renderComparisonCell({
      columnId: '1',
      colIndex: 2,
      rowIndex: 0,
      renderCellValue,
    });
    expect(comparisonCell1.getCellValue()).toBeInTheDocument();
    expect(comparisonCell1.getCell()).not.toHaveClass(BASE_CELL_CLASS);
    expect(comparisonCell1.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(comparisonCell1.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(comparisonCell1.getAllSegments()).toHaveLength(12);
    expect(comparisonCell1.getAddedSegments()).toHaveLength(3);
    expect(comparisonCell1.getRemovedSegments()).toHaveLength(3);
    expect(comparisonCell1.getCell()).toMatchSnapshot();
    const comparisonCell2 = renderComparisonCell({
      columnId: '2',
      colIndex: 3,
      rowIndex: 0,
      renderCellValue,
    });
    expect(comparisonCell2.getCellValue()).toBeInTheDocument();
    expect(comparisonCell2.getCell()).not.toHaveClass(BASE_CELL_CLASS);
    expect(comparisonCell2.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(comparisonCell2.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(comparisonCell2.getAllSegments()).toHaveLength(1);
    expect(comparisonCell2.getAddedSegments()).toHaveLength(0);
    expect(comparisonCell2.getRemovedSegments()).toHaveLength(0);
    expect(comparisonCell2.getCell()).toMatchSnapshot();
  });

  it('should render cells with diff mode "Words"', () => {
    const { renderCellValue } = renderComparisonCellValue({ diffMode: 'words' });
    const baseCell = renderComparisonCell({
      columnId: '0',
      colIndex: 1,
      rowIndex: 0,
      renderCellValue,
    });
    expect(baseCell.getCellValue()).toBeInTheDocument();
    expect(baseCell.getCell()).toHaveClass(BASE_CELL_CLASS);
    expect(baseCell.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(baseCell.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(baseCell.getAllSegments()).toHaveLength(0);
    expect(baseCell.getCell()).toMatchSnapshot();
    const comparisonCell1 = renderComparisonCell({
      columnId: '1',
      colIndex: 2,
      rowIndex: 0,
      renderCellValue,
    });
    expect(comparisonCell1.getCellValue()).toBeInTheDocument();
    expect(comparisonCell1.getCell()).not.toHaveClass(BASE_CELL_CLASS);
    expect(comparisonCell1.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(comparisonCell1.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(comparisonCell1.getAllSegments()).toHaveLength(8);
    expect(comparisonCell1.getAddedSegments()).toHaveLength(3);
    expect(comparisonCell1.getRemovedSegments()).toHaveLength(2);
    expect(comparisonCell1.getCell()).toMatchSnapshot();
    const comparisonCell2 = renderComparisonCell({
      columnId: '2',
      colIndex: 3,
      rowIndex: 0,
      renderCellValue,
    });
    expect(comparisonCell2.getCellValue()).toBeInTheDocument();
    expect(comparisonCell2.getCell()).not.toHaveClass(BASE_CELL_CLASS);
    expect(comparisonCell2.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(comparisonCell2.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(comparisonCell2.getAllSegments()).toHaveLength(1);
    expect(comparisonCell2.getAddedSegments()).toHaveLength(0);
    expect(comparisonCell2.getRemovedSegments()).toHaveLength(0);
    expect(comparisonCell2.getCell()).toMatchSnapshot();
  });

  it('should render cells with diff mode "Lines"', () => {
    const { renderCellValue } = renderComparisonCellValue({ diffMode: 'lines' });
    const baseCell = renderComparisonCell({
      columnId: '0',
      colIndex: 1,
      rowIndex: 1,
      renderCellValue,
    });
    expect(baseCell.getCellValue()).toBeInTheDocument();
    expect(baseCell.getCell()).toHaveClass(BASE_CELL_CLASS);
    expect(baseCell.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(baseCell.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(baseCell.getAllSegments()).toHaveLength(0);
    expect(baseCell.getCell()).toMatchSnapshot();
    const comparisonCell1 = renderComparisonCell({
      columnId: '1',
      colIndex: 2,
      rowIndex: 1,
      renderCellValue,
    });
    expect(comparisonCell1.getCellValue()).toBeInTheDocument();
    expect(comparisonCell1.getCell()).not.toHaveClass(BASE_CELL_CLASS);
    expect(comparisonCell1.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(comparisonCell1.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(comparisonCell1.getAllSegments()).toHaveLength(5);
    expect(comparisonCell1.getAddedSegments()).toHaveLength(1);
    expect(comparisonCell1.getRemovedSegments()).toHaveLength(1);
    expect(comparisonCell1.getCell()).toMatchSnapshot();
    const comparisonCell2 = renderComparisonCell({
      columnId: '2',
      colIndex: 3,
      rowIndex: 1,
      renderCellValue,
    });
    expect(comparisonCell2.getCellValue()).toBeInTheDocument();
    expect(comparisonCell2.getCell()).not.toHaveClass(BASE_CELL_CLASS);
    expect(comparisonCell2.getCell()).not.toHaveClass(MATCH_CELL_CLASS);
    expect(comparisonCell2.getCell()).not.toHaveClass(DIFF_CELL_CLASS);
    expect(comparisonCell2.getAllSegments()).toHaveLength(1);
    expect(comparisonCell2.getAddedSegments()).toHaveLength(0);
    expect(comparisonCell2.getRemovedSegments()).toHaveLength(0);
    expect(comparisonCell2.getCell()).toMatchSnapshot();
  });

  it('should not recalculate diffs for advanced modes when remounting the same cell', () => {
    calculateDiff.mockClear();
    expect(calculateDiff).not.toHaveBeenCalled();
    const { rerender, renderCellValue } = renderComparisonCellValue({ diffMode: 'chars' });
    const cellProps1 = {
      columnId: '1',
      colIndex: 2,
      rowIndex: 1,
      renderCellValue,
    };
    const cellProps2 = {
      columnId: '2',
      colIndex: 3,
      rowIndex: 1,
      renderCellValue,
    };
    renderComparisonCell(cellProps1);
    expect(calculateDiff).toHaveBeenCalledTimes(1);
    renderComparisonCell(cellProps2);
    expect(calculateDiff).toHaveBeenCalledTimes(2);
    renderComparisonCell(cellProps1);
    expect(calculateDiff).toHaveBeenCalledTimes(2);
    renderComparisonCell(cellProps2);
    expect(calculateDiff).toHaveBeenCalledTimes(2);
    rerender({ diffMode: 'words', selectedDocs: ['1', '2', '0'] });
    const cellProps3 = {
      ...cellProps1,
      columnId: '2',
    };
    const cellProps4 = {
      ...cellProps2,
      columnId: '0',
    };
    renderComparisonCell(cellProps3);
    expect(calculateDiff).toHaveBeenCalledTimes(3);
    renderComparisonCell(cellProps4);
    expect(calculateDiff).toHaveBeenCalledTimes(4);
    renderComparisonCell(cellProps3);
    expect(calculateDiff).toHaveBeenCalledTimes(4);
    renderComparisonCell(cellProps4);
    expect(calculateDiff).toHaveBeenCalledTimes(4);
    rerender({ diffMode: 'lines', selectedDocs: ['2', '0', '1'] });
    const cellProps5 = {
      ...cellProps1,
      columnId: '0',
    };
    const cellProps6 = {
      ...cellProps2,
      columnId: '1',
    };
    renderComparisonCell(cellProps5);
    expect(calculateDiff).toHaveBeenCalledTimes(5);
    renderComparisonCell(cellProps6);
    expect(calculateDiff).toHaveBeenCalledTimes(6);
    renderComparisonCell(cellProps5);
    expect(calculateDiff).toHaveBeenCalledTimes(6);
    renderComparisonCell(cellProps6);
    expect(calculateDiff).toHaveBeenCalledTimes(6);
  });
});
