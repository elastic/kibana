import type { Interpolation, Theme } from '@emotion/react';
import React from 'react';
import type { MonacoMessage } from '@kbn/code-editor';
import type { QuerySource } from '@kbn/esql-types/src/esql_telemetry_types';
import type { ESQLQueryStats as QueryStats } from '@kbn/esql-types';
import type { DataErrorsControl } from '../types';
import type { EsqlStarredQueriesService } from './esql_starred_queries_service';
interface EditorFooterProps {
    styles: {
        bottomContainer: Interpolation<Theme>;
        historyContainer: Interpolation<Theme>;
    };
    errors?: MonacoMessage[];
    warnings?: MonacoMessage[];
    onErrorClick: (error: MonacoMessage) => void;
    onUpdateAndSubmitQuery: (newQuery: string, querySource: QuerySource) => void;
    onPrettifyQuery: () => void;
    isHistoryOpen: boolean;
    setIsHistoryOpen: (status: boolean) => void;
    isLanguageComponentOpen: boolean;
    setIsLanguageComponentOpen: (status: boolean) => void;
    measuredContainerWidth: number;
    resizableContainerButton?: JSX.Element;
    resizableContainerHeight: number;
    editorIsInline?: boolean;
    isSpaceReduced?: boolean;
    displayDocumentationAsFlyout?: boolean;
    dataErrorsControl?: DataErrorsControl;
    starredQueriesService: EsqlStarredQueriesService | null;
    queryStats?: QueryStats;
}
export declare const EditorFooter: React.NamedExoticComponent<EditorFooterProps>;
export {};
