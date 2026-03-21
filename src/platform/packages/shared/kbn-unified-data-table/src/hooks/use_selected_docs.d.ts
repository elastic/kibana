import type { DataTableRecord } from '@kbn/discover-utils';
export interface UseSelectedDocsState {
    isDocSelected: (docId: string) => boolean;
    getCountOfFilteredSelectedDocs: (docIds: string[]) => number;
    hasSelectedDocs: boolean;
    selectedDocsCount: number;
    docIdsInSelectionOrder: string[];
    toggleDocSelection: (docId: string) => void;
    toggleMultipleDocsSelection: (toDocId: string) => void;
    selectAllDocs: () => void;
    selectMoreDocs: (docIds: string[]) => void;
    deselectSomeDocs: (docIds: string[]) => void;
    replaceSelectedDocs: (docIds: string[]) => void;
    clearAllSelectedDocs: () => void;
    getSelectedDocsOrderedByRows: (rows: DataTableRecord[]) => DataTableRecord[];
}
export declare const useSelectedDocs: (docMap: Map<string, {
    doc: DataTableRecord;
    docIndex: number;
}>) => UseSelectedDocsState;
