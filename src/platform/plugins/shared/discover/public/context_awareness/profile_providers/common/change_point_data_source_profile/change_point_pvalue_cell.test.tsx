/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { ChangePointPvalueCell } from './change_point_pvalue_cell';

const renderCell = (flattened: Record<string, unknown>) => {
  const props = {
    row: { id: '1', raw: {}, flattened },
    dataView: {},
    columnId: 'pvalue',
    isDetails: false,
    isExpanded: false,
    fieldFormats: {},
    closePopover: jest.fn(),
    setCellProps: jest.fn(),
  } as unknown as DataGridCellValueElementProps;

  return render(<ChangePointPvalueCell {...props} context={{ pvalueColumnId: 'pvalue' }} />);
};

describe('ChangePointPvalueCell', () => {
  it('renders the impact badge and formatted value for a finite pvalue', () => {
    renderCell({ pvalue: 0.01 });

    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText('0.01000')).toBeInTheDocument();
  });

  it.each([
    ['null', { pvalue: null }],
    ['undefined', {}],
    ['NaN', { pvalue: Number.NaN }],
  ])('renders a dash when the pvalue is %s', (_label, flattened) => {
    renderCell(flattened);

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByText('low')).not.toBeInTheDocument();
  });
});
