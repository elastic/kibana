/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { type CriteriaWithPagination } from '@elastic/eui';
import { EuiTablePersistProps, useEuiTablePersist } from './use_table_persist';
import { PropertySort } from './types';

export interface EuiTablePersistInjectedProps<T> {
  onTableChange: (change: CriteriaWithPagination<T>) => void;
  sorting: { sort: PropertySort<T> } | true;
  pageSize: number;
}

export function withEuiTablePersist<T extends object, Props>(
  WrappedComponent: React.ComponentType<Props & EuiTablePersistInjectedProps<T>>,
  persistProps: EuiTablePersistProps<T>
) {
  type HOCProps = Omit<Props, keyof EuiTablePersistInjectedProps<T>> &
    Partial<EuiTablePersistProps<T>>;

  const HOC: React.FC<HOCProps> = (props) => {
    const mergedProps = { ...persistProps, ...props };

    const {
      tableId,
      customOnTableChange,
      initialSort,
      initialPageSize,
      pageSizeOptions,
      ...restProps
    } = mergedProps;

    const { pageSize, sorting, onTableChange } = useEuiTablePersist<T>({
      tableId,
      customOnTableChange,
      initialSort,
      initialPageSize,
      pageSizeOptions,
    });

    // Render the wrapped component with the injected props from `useEuiTablePersist`
    return (
      <WrappedComponent
        {...(restProps as Props)}
        pageSize={pageSize}
        sorting={sorting}
        onTableChange={onTableChange}
      />
    );
  };

  return HOC;
}
