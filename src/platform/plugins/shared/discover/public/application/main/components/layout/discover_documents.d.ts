import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
export declare const onResize: (colSettings: {
    columnId: string;
    width: number | undefined;
}, currentGrid: DiscoverGridSettings | undefined, updateGrid: (grid: DiscoverGridSettings) => void) => void;
declare function DiscoverDocumentsComponent({ viewModeToggle, dataView, onAddFilter, onFieldEdited, }: {
    viewModeToggle: React.ReactElement | undefined;
    dataView: DataView;
    onAddFilter?: DocViewFilterFn;
    onFieldEdited?: (options: {
        editedDataView: DataView;
    }) => void;
}): React.JSX.Element;
export declare const DiscoverDocuments: React.MemoExoticComponent<typeof DiscoverDocumentsComponent>;
export {};
