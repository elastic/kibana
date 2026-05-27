import type { CriteriaWithPagination } from '@elastic/eui';
import type { PropertySort } from './types';
export interface EuiTablePersistProps<T> {
    /** A unique id that will be included in the local storage variable for this table. */
    tableId: string;
    /** (Optional) Specifies a custom onTableChange handler. */
    customOnTableChange?: (change: CriteriaWithPagination<T>) => void;
    /** (Optional) Specifies a custom initial table sorting. */
    initialSort?: PropertySort<T>;
    /** (Optional) Specifies a custom initial page size for the table. Defaults to 50. */
    initialPageSize?: number;
    /** (Optional) Specifies custom page size options for the table.
     * Defaults to {@link DEFAULT_PAGE_SIZE_OPTIONS} */
    pageSizeOptions?: number[];
}
/**
 * A hook that stores and retrieves from local storage the table page size and sort criteria.
 * Returns the persisting page size and sort and the onTableChange handler that should be passed
 * as props to an Eui table component.
 */
export declare function useEuiTablePersist<T extends object>(props: EuiTablePersistProps<T> & {
    initialSort: PropertySort<T>;
}): {
    sorting: {
        sort: PropertySort<T>;
    };
    pageSize: number;
    onTableChange: (nextValues: CriteriaWithPagination<T>) => void;
};
export declare function useEuiTablePersist<T extends object>(props: EuiTablePersistProps<T> & {
    initialSort?: undefined;
}): {
    sorting: true;
    pageSize: number;
    onTableChange: (nextValues: CriteriaWithPagination<T>) => void;
};
export declare function useEuiTablePersist<T extends object>(props: EuiTablePersistProps<T>): {
    sorting: true | {
        sort: PropertySort<T>;
    };
    pageSize: number;
    onTableChange: (nextValues: CriteriaWithPagination<T>) => void;
};
