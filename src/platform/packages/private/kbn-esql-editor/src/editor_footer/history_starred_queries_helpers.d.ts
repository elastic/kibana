import type { EuiBasicTableColumn } from '@elastic/eui';
import type { QueryHistoryItem } from '../history_local_storage';
export declare const getReducedSpaceStyling: () => string;
export declare const swapArrayElements: (array: Array<EuiBasicTableColumn<QueryHistoryItem>>, index1: number, index2: number) => EuiBasicTableColumn<QueryHistoryItem>[];
