import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { State } from './table_list_view_table';
import type { Action } from './actions';
export declare function getReducer<T extends UserContentCommonSchema>(): (state: State<T>, action: Action<T>) => State<T>;
