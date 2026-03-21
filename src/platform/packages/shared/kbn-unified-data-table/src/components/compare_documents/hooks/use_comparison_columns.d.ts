import type { EuiDataGridColumn } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
export interface UseComparisonColumnsProps {
    wrapper: HTMLElement | null;
    isPlainRecord: boolean;
    fieldColumnId: string;
    selectedDocIds: string[];
    getDocById: (docId: string) => DataTableRecord | undefined;
    replaceSelectedDocs: (docIds: string[]) => void;
}
export declare const DEFAULT_COLUMN_WIDTH = 300;
export declare const FIELD_COLUMN_WIDTH = 200;
export declare const FIELD_COLUMN_NAME: string;
export declare const useComparisonColumns: ({ wrapper, isPlainRecord, fieldColumnId, selectedDocIds, getDocById, replaceSelectedDocs, }: UseComparisonColumnsProps) => EuiDataGridColumn[];
