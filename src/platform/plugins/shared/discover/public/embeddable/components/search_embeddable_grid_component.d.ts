import React from 'react';
import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { type FetchContext } from '@kbn/presentation-publishing';
import type { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
import type { SearchEmbeddableApi, SearchEmbeddableStateManager } from '../types';
import { type InlineEditing } from './saved_search_grid';
interface SavedSearchEmbeddableComponentProps {
    api: SearchEmbeddableApi & {
        fetchWarnings$: BehaviorSubject<SearchResponseIncompleteWarning[]>;
        fetchContext$: BehaviorSubject<FetchContext | undefined>;
    };
    dataView: DataView;
    onAddFilter?: DocViewFilterFn;
    enableDocumentViewer: boolean;
    inlineEditing: InlineEditing;
    docViewerRef: React.RefObject<DocViewerApi>;
    expandedDoc: DataTableRecord | undefined;
    initialDocViewerTabId: string | undefined;
    setExpandedDoc?: (doc: DataTableRecord | undefined, options?: {
        initialTabId?: string;
    }) => void;
    stateManager: SearchEmbeddableStateManager;
}
export declare function SearchEmbeddableGridComponent({ api, dataView, onAddFilter, enableDocumentViewer, inlineEditing, docViewerRef, expandedDoc, initialDocViewerTabId, setExpandedDoc, stateManager, }: SavedSearchEmbeddableComponentProps): React.JSX.Element;
export {};
