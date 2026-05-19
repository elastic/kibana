import React from 'react';
import type { EuiBasicTableColumn, CustomItemAction } from '@elastic/eui';
import type { Interpolation, Theme } from '@emotion/react';
import { QuerySource } from '@kbn/esql-types/src/esql_telemetry_types';
import { type QueryHistoryItem } from '../history_local_storage';
import type { EsqlStarredQueriesService } from './esql_starred_queries_service';
export declare function QueryHistoryAction({ toggleHistory, isHistoryOpen, isSpaceReduced, }: {
    toggleHistory: () => void;
    isHistoryOpen: boolean;
    isSpaceReduced?: boolean;
}): React.JSX.Element;
export declare const getTableColumns: (width: number, isOnReducedSpaceLayout: boolean, actions: Array<CustomItemAction<QueryHistoryItem>>, isStarredTab?: boolean) => Array<EuiBasicTableColumn<QueryHistoryItem>>;
export declare function QueryList({ containerCSS, containerWidth, onUpdateAndSubmit, height, listItems, starredQueriesService, tableCaption, dataTestSubj, isStarredTab, }: {
    listItems: QueryHistoryItem[];
    containerCSS: Interpolation<Theme>;
    containerWidth: number;
    onUpdateAndSubmit: (qs: string, querySource: QuerySource) => void;
    height: number;
    starredQueriesService?: EsqlStarredQueriesService;
    tableCaption?: string;
    dataTestSubj?: string;
    isStarredTab?: boolean;
}): React.JSX.Element;
export declare function QueryColumn({ queryString, containerWidth, isOnReducedSpaceLayout, }: {
    containerWidth: number;
    queryString: string;
    isOnReducedSpaceLayout: boolean;
}): React.JSX.Element;
export declare function HistoryAndStarredQueriesTabs({ containerCSS, containerWidth, isSpaceReduced, onUpdateAndSubmit, onClose, height, starredQueriesService, }: {
    containerCSS: Interpolation<Theme>;
    containerWidth: number;
    onUpdateAndSubmit: (qs: string, querySource: QuerySource) => void;
    onClose: () => void;
    isSpaceReduced?: boolean;
    height: number;
    starredQueriesService: EsqlStarredQueriesService | null;
}): React.JSX.Element;
