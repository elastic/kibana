import React from 'react';
import { type CriteriaWithPagination } from '@elastic/eui';
import type { EuiTablePersistProps } from './use_table_persist';
import type { PropertySort } from './types';
export interface EuiTablePersistInjectedProps<T> {
    euiTablePersist: {
        /** The EuiInMemoryTable onTableChange prop */
        onTableChange: (change: CriteriaWithPagination<T>) => void;
        /** The EuiInMemoryTable sorting prop */
        sorting: {
            sort: PropertySort<T>;
        } | true;
        /** The EuiInMemoryTable pagination.pageSize value */
        pageSize: number;
    };
}
export type EuiTablePersistPropsGetter<T extends object, P extends object> = (props: Omit<P, keyof EuiTablePersistInjectedProps<T>>) => EuiTablePersistProps<T>;
export type HOCProps<T extends object, P extends object> = P & {
    /** Custom value for the EuiTablePersist HOC */
    euiTablePersistProps?: Partial<EuiTablePersistProps<T>>;
};
export declare function withEuiTablePersist<T extends object, Props extends object>(WrappedComponent: React.ComponentClass<Props & EuiTablePersistInjectedProps<T>>, euiTablePersistDefault: (EuiTablePersistProps<T> & {
    get?: undefined;
}) | {
    get: EuiTablePersistPropsGetter<T, Props>;
}): React.FC<HOCProps<T, Omit<Props, "euiTablePersist">>>;
