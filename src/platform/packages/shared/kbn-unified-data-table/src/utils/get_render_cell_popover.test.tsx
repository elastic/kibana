/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import { render } from '@testing-library/react';
import React from 'react';
import { getCustomCellPopoverRenderer } from './get_render_cell_popover';

const setCellPopoverPropsMocks = jest.fn();

const DefaultCellPopover = () => <div>{'DefaultCellPopover'}</div>;

const defaultProps: EuiDataGridCellPopoverElementProps = {
  rowIndex: 0,
  colIndex: 0,
  columnId: 'test_column',
  setCellPopoverProps: setCellPopoverPropsMocks,
  DefaultCellPopover,
  cellActions: [],
  children: <div>{'children'}</div>,
  cellContentsElement: (<div>{'cellContentsElement'}</div>) as unknown as HTMLDivElement,
};

const renderTestComponent = (overrideProps = {}) => {
  const Renderer = getCustomCellPopoverRenderer();

  render(<Renderer {...defaultProps} {...overrideProps} />);
};

describe('getCustomCellPopoverRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render DefaultCellPopover', () => {
    renderTestComponent();

    expect(setCellPopoverPropsMocks).toHaveBeenCalledWith({
      panelClassName: 'unifiedDataTable__cellPopover',
    });
  });

  it('should render a DefaultCellPopover with a wider panel for allowed columns', () => {
    renderTestComponent({ columnId: '_source' });

    expect(setCellPopoverPropsMocks).toHaveBeenCalledWith({
      panelClassName: 'unifiedDataTable__cellPopover',
      panelProps: {
        css: {
          maxInlineSize: 'min(75vw, 600px) !important',
        },
      },
    });
  });
});
