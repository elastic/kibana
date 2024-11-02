/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { PureComponent } from 'react';
import { type CriteriaWithPagination } from '@elastic/eui';
import { EuiTablePersistProps } from './use_table_persist';
import { DEFAULT_INITIAL_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from './constants';
import { createStorage } from './storage';
import { validatePersistData } from './validate_persist_data';
import { PersistData, PropertySort } from './types';

interface EuiTablePersistState<T> {
  pageSize: number;
  sort?: PropertySort<T>;
}

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

  return class EuiTablePersistHOC extends PureComponent<HOCProps, EuiTablePersistState<T>> {
    private storage = createStorage();

    constructor(props: HOCProps) {
      super(props);
      const { tableId, pageSizeOptions, initialPageSize, initialSort } = {
        ...persistProps,
        ...this.props,
      };
      const storedPersistData = this.storage.get(tableId, undefined);
      const { pageSize: storagePageSize, sort: storageSort }: PersistData<T> = validatePersistData(
        storedPersistData,
        pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS
      );

      this.state = {
        pageSize: storagePageSize ?? initialPageSize ?? DEFAULT_INITIAL_PAGE_SIZE,
        sort: storageSort ?? initialSort,
      };
    }

    onTableChange = (nextValues: CriteriaWithPagination<T>) => {
      const { customOnTableChange, tableId, pageSizeOptions } = {
        ...persistProps,
        ...this.props,
      };
      const { pageSize: storagePageSize, sort: storageSort } = validatePersistData(
        this.storage.get(tableId, undefined),
        pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS
      );

      if (customOnTableChange) {
        customOnTableChange(nextValues);
      }

      let nextSort: PropertySort<T> | undefined;
      const isSortRemoved = nextValues.sort?.field?.toString() === '';
      if (nextValues.sort?.field && nextValues.sort?.direction) {
        nextSort = nextValues.sort;
      }

      if (nextValues.sort?.field || nextValues.sort?.direction) {
        this.setState({ sort: nextSort });
      }

      const nextPageSize = nextValues.page?.size;
      if (nextPageSize) {
        this.setState({ pageSize: nextPageSize });
      }

      if (
        (nextPageSize && nextPageSize !== storagePageSize) ||
        (nextSort && nextSort !== storageSort) ||
        isSortRemoved
      ) {
        const nextPersistData: PersistData<T> = {
          pageSize: nextPageSize,
          sort: nextSort,
        };
        this.storage.set(tableId, nextPersistData);
      }
    };

    render() {
      const { pageSize, sort } = this.state;
      const sorting = sort ? { sort } : true;
      const {
        tableId,
        customOnTableChange,
        pageSizeOptions,
        initialPageSize,
        initialSort,
        ...rest
      } = {
        ...persistProps,
        ...this.props,
      };

      return (
        <WrappedComponent
          {...(rest as Props)}
          pageSize={pageSize}
          sorting={sorting}
          onTableChange={this.onTableChange}
        />
      );
    }
  };
}
