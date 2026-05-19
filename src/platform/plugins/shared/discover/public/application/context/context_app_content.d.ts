import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { type SearchResponseWarning } from '@kbn/search-response-warnings';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { LoadingStatus } from './services/context_query_state';
import type { AppState } from './services/context_state';
export interface ContextAppContentProps {
    columns: string[];
    grid?: DiscoverGridSettings;
    onAddColumn: (columnsName: string) => void;
    onRemoveColumn: (columnsName: string) => void;
    onSetColumns: (columnsNames: string[], hideTimeColumn: boolean) => void;
    dataView: DataView;
    predecessorCount: number;
    successorCount: number;
    rows: DataTableRecord[];
    predecessors: DataTableRecord[];
    successors: DataTableRecord[];
    anchorStatus: LoadingStatus;
    predecessorsStatus: LoadingStatus;
    successorsStatus: LoadingStatus;
    interceptedWarnings: SearchResponseWarning[];
    setAppState: (newState: Partial<AppState>) => void;
    addFilter: DocViewFilterFn;
}
export declare function clamp(value: number): number;
export declare function ContextAppContent({ columns, grid, onAddColumn, onRemoveColumn, onSetColumns, dataView, predecessorCount, successorCount, rows, predecessors, successors, anchorStatus, predecessorsStatus, successorsStatus, interceptedWarnings, setAppState, addFilter, }: ContextAppContentProps): React.JSX.Element;
