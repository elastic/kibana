import React from 'react';
import type { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FetchContext } from '@kbn/presentation-publishing';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { SearchEmbeddableApi, SearchEmbeddableStateManager } from '../types';
interface SavedSearchEmbeddableComponentProps {
    api: SearchEmbeddableApi & {
        fetchContext$: BehaviorSubject<FetchContext | undefined>;
    };
    dataView: DataView;
    onAddFilter?: DocViewFilterFn;
    stateManager: SearchEmbeddableStateManager;
}
export declare function SearchEmbeddablFieldStatsTableComponent({ api, dataView, onAddFilter, stateManager, }: SavedSearchEmbeddableComponentProps): React.JSX.Element;
export {};
