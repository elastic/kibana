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
  euiTablePersist: {
    /** The EuiInMemoryTable onTableChange prop */
    onTableChange: (change: CriteriaWithPagination<T>) => void;
    /** The EuiInMemoryTable sorting prop */
    sorting: { sort: PropertySort<T> } | true;
    /** The EuiInMemoryTable pagination.pageSize value */
    pageSize: number;
  };
}

export type EuiTablePersistPropsGetter<T extends object, P extends object> = (
  props: Omit<P, keyof EuiTablePersistInjectedProps<T>>
) => EuiTablePersistProps<T>;

export type HOCProps<T extends object, P extends object> = P & {
  /** Custom value for the EuiTablePersist HOC */
  euiTablePersistProps?: Partial<EuiTablePersistProps<T>>;
};

export function withEuiTablePersist<T extends object, Props extends object>(
  WrappedComponent: React.ComponentClass<Props & EuiTablePersistInjectedProps<T>>,
  euiTablePersistDefault:
    | (EuiTablePersistProps<T> & { get?: undefined })
    | {
        get: EuiTablePersistPropsGetter<T, Props>;
      }
) {
  const HOC: React.FC<HOCProps<T, Omit<Props, keyof EuiTablePersistInjectedProps<T>>>> = (
    props
  ) => {
    const getterOverride = euiTablePersistDefault.get ? euiTablePersistDefault.get(props) : {};

    const mergedProps = {
      ...euiTablePersistDefault,
      ...props.euiTablePersistProps,
      ...getterOverride, // Getter override other props
    };

    const { tableId, customOnTableChange, initialSort, initialPageSize, pageSizeOptions } =
      mergedProps;

    if (!tableId) {
      throw new Error('tableId is required');
    }

    const euiTablePersist = useEuiTablePersist<T>({
      tableId,
      customOnTableChange,
      initialSort,
      initialPageSize,
      pageSizeOptions,
    });

    const { euiTablePersistProps, ...rest } = props;

    return <WrappedComponent {...(rest as Props)} euiTablePersist={euiTablePersist} />;
  };

  return HOC;
}
