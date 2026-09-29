/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import React, { PureComponent } from 'react';
import { render, screen } from '@testing-library/react';

import { withEuiTablePersist, type EuiTablePersistInjectedProps } from './table_persist_hoc';

const mockUseEuiTablePersist = vi.fn().mockReturnValue({
  pageSize: 'mockPageSize',
  sorting: 'mockSorting',
  onTableChange: 'mockOnTableChange',
});

vi.mock('./use_table_persist', async () => {
  const original = (await vi.importActual('./use_table_persist'));

  return {
    ...original,
    useEuiTablePersist: (...args: unknown[]) => mockUseEuiTablePersist(...args),
  };
});

class TestComponent extends PureComponent<EuiTablePersistInjectedProps<any>> {
  constructor(props: EuiTablePersistInjectedProps<any>) {
    super(props);
  }

  render() {
    return <div data-test-subj="value">{JSON.stringify(this.props.euiTablePersist)}</div>;
  }
}

describe('withEuiTablePersist', () => {
  it('should call useEuiTablePersist and return its values', () => {
    const customOnTableChange = vi.fn();
    const pageSizeOptions = [5, 10, 25, 50];

    const WrappedComponent = withEuiTablePersist(TestComponent, {
      tableId: 'testTableId',
      initialPageSize: 10,
      initialSort: { field: 'testField', direction: 'asc' },
      customOnTableChange,
      pageSizeOptions,
    });

    render(<WrappedComponent />);

    expect(mockUseEuiTablePersist).toHaveBeenCalledWith({
      tableId: 'testTableId',
      customOnTableChange,
      initialPageSize: 10,
      initialSort: { field: 'testField', direction: 'asc' },
      pageSizeOptions,
    });

    expect(screen.getByTestId('value').textContent).toBe(
      JSON.stringify({
        pageSize: 'mockPageSize',
        sorting: 'mockSorting',
        onTableChange: 'mockOnTableChange',
      })
    );
  });

  it('should allow override through props', () => {
    const customOnTableChangeDefault = vi.fn();
    const customOnTableChangeProp = vi.fn();
    const pageSizeOptions = [5, 10, 25, 50];

    const WrappedComponent = withEuiTablePersist(TestComponent, {
      tableId: 'testTableId',
      initialPageSize: 10,
      initialSort: { field: 'testField', direction: 'asc' },
      customOnTableChange: customOnTableChangeDefault,
      pageSizeOptions,
    });

    render(
      <WrappedComponent
        euiTablePersistProps={{
          tableId: 'testTableIdChanged',
          initialPageSize: 20,
          initialSort: { field: 'testFieldChanged', direction: 'desc' },
          customOnTableChange: customOnTableChangeProp,
          pageSizeOptions: [5],
        }}
      />
    );

    expect(mockUseEuiTablePersist).toHaveBeenCalledWith({
      tableId: 'testTableIdChanged',
      customOnTableChange: customOnTableChangeProp,
      initialPageSize: 20,
      initialSort: { field: 'testFieldChanged', direction: 'desc' },
      pageSizeOptions: [5],
    });

    expect(screen.getByTestId('value').textContent).toBe(
      JSON.stringify({
        pageSize: 'mockPageSize',
        sorting: 'mockSorting',
        onTableChange: 'mockOnTableChange',
      })
    );
  });
});
