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
import { KeyValueDataGrid } from '.';
import { buildHitMock, mockUnifiedDocViewerServices } from '../../../../../__mocks__';
import { buildDataViewMock, shallowMockedFields } from '@kbn/discover-utils/src/__mocks__';
import { setUnifiedDocViewerServices } from '../../../../../plugin';

const mockFields = {
  fieldA: {
    name: 'fieldA',
    value: 'valueA',
    nameCellContent: <span>Field A Name</span>,
    valueCellContent: <span>Field A Value</span>,
  },
  fieldB: {
    name: 'fieldB',
    value: 'valueB',
    nameCellContent: <span>Field B Name</span>,
    valueCellContent: <span>Field B Value</span>,
  },
};

const mockDataView = buildDataViewMock({
  name: 'data-view-mock',
  fields: shallowMockedFields,
});

const mockHit = buildHitMock({}, 'index', mockDataView);

const defaultProps = {
  hit: mockHit,
  dataView: mockDataView,
  columnsMeta: {},
  fields: mockFields,
  columns: ['name', 'value'],
  filter: jest.fn(),
  onAddColumn: jest.fn(),
  onRemoveColumn: jest.fn(),
  isEsqlMode: false,
  title: 'Test Grid',
};

describe('KeyValueDataGrid', () => {
  beforeAll(() => {
    setUnifiedDocViewerServices(mockUnifiedDocViewerServices);
  });

  it('renders the grid with correct aria-label', () => {
    render(<KeyValueDataGrid {...defaultProps} />);
    expect(screen.getByLabelText('Test Grid')).toBeInTheDocument();
  });

  it('renders name and value cell content', () => {
    render(<KeyValueDataGrid {...defaultProps} />);
    expect(screen.getByText('Field A Name')).toBeInTheDocument();
    expect(screen.getByText('Field A Value')).toBeInTheDocument();
    expect(screen.getByText('Field B Name')).toBeInTheDocument();
    expect(screen.getByText('Field B Value')).toBeInTheDocument();
  });

  it('returns null for unknown columnId in renderCellValue', () => {
    render(<KeyValueDataGrid {...defaultProps} columns={['unknown']} />);
    expect(screen.getByLabelText('Test Grid')).toBeInTheDocument();
  });

  it('does not break if fields is empty', () => {
    render(<KeyValueDataGrid {...defaultProps} fields={{}} />);
    expect(screen.getByLabelText('Test Grid')).toBeInTheDocument();
  });

  it('calls onRemoveColumn if field is present in columns', () => {
    const onRemoveColumn = jest.fn();
    const onAddColumn = jest.fn();
    const columns = ['name', 'value'];

    render(<KeyValueDataGrid {...defaultProps} />);

    const fieldName = 'name';
    const onToggleColumn = (field: string) => {
      if (columns.includes(field)) {
        onRemoveColumn(field);
      } else {
        onAddColumn(field);
      }
    };

    onToggleColumn(fieldName);
    expect(onRemoveColumn).toHaveBeenCalledWith('name');
    expect(onAddColumn).not.toHaveBeenCalled();
  });

  it('calls onAddColumn if field is not present in columns', () => {
    const onRemoveColumn = jest.fn();
    const onAddColumn = jest.fn();
    const columns = ['name'];

    render(<KeyValueDataGrid {...defaultProps} />);

    const fieldName = 'value';
    const onToggleColumn = (field: string) => {
      if (columns.includes(field)) {
        onRemoveColumn(field);
      } else {
        onAddColumn(field);
      }
    };

    onToggleColumn(fieldName);
    expect(onAddColumn).toHaveBeenCalledWith('value');
    expect(onRemoveColumn).not.toHaveBeenCalled();
  });
});
