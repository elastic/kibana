import type { ESQLColumn } from '@elastic/esql/types';
import type { GetColumnMapFn } from '../shared/columns_retrieval_helpers';
export declare function getColumnHover(node: ESQLColumn, getColumnMap: GetColumnMapFn): Promise<Array<{
    value: string;
}>>;
