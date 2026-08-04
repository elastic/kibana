import type { EuiDataGridColumn } from '@elastic/eui';
import type { DocMap } from '../../../types';
export interface UseComparisonColumnsProps {
    wrapper: HTMLElement | null;
    isPlainRecord: boolean;
    fieldColumnId: string;
    selectedDocIds: string[];
    docMap: DocMap;
    replaceSelectedDocs: (docIds: string[]) => void;
}
export declare const DEFAULT_COLUMN_WIDTH = 300;
export declare const FIELD_COLUMN_WIDTH = 200;
export declare const FIELD_COLUMN_NAME: string;
export declare const useComparisonColumns: ({ wrapper, isPlainRecord, fieldColumnId, selectedDocIds, docMap, replaceSelectedDocs, }: UseComparisonColumnsProps) => EuiDataGridColumn[];
