import React from 'react';
import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { type FetchContext } from '@kbn/presentation-publishing';
import type { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { SearchEmbeddableApi, SearchEmbeddableStateManager } from '../types';
import { type InlineEditing } from './saved_search_grid';
interface SavedSearchEmbeddableComponentProps {
    api: SearchEmbeddableApi & {
        fetchWarnings$: BehaviorSubject<SearchResponseIncompleteWarning[]>;
        fetchContext$: BehaviorSubject<FetchContext | undefined>;
    };
    dataView: DataView;
    onAddFilter?: DocViewFilterFn;
    onRefreshData?: () => void;
    enableDocumentViewer: boolean;
    inlineEditing: InlineEditing;
    stateManager: SearchEmbeddableStateManager;
}
export declare function SearchEmbeddableGridComponent({ api, dataView, onAddFilter, onRefreshData, enableDocumentViewer, inlineEditing, stateManager, }: SavedSearchEmbeddableComponentProps): React.JSX.Element;
export {};
