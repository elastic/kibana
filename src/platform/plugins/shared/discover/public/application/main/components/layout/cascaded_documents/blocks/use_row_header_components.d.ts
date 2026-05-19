import React from 'react';
import { type AggregateQuery } from '@kbn/es-query';
import type { StatsCommandSummary } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers/utils';
import { type ESQLStatsQueryMeta } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { type UpdateESQLQueryFn } from '../../../../../../context_awareness';
import type { ESQLDataGroupNode } from './types';
import type { internalStateActions } from '../../../../state_management/redux';
interface RowContext {
    groupId: string;
    groupValue: string;
}
interface RowClickActionContext {
    dataView: DataView;
    editorQuery: AggregateQuery;
    statsFieldSummary: StatsCommandSummary['grouping'] | undefined;
    esqlVariables: ESQLControlVariable[] | undefined;
    rowContext: RowContext;
    closeActionMenu: () => void;
    openInNewTab: (...args: Parameters<typeof internalStateActions.openInNewTab>) => void;
    updateESQLQuery: UpdateESQLQueryFn;
}
interface ContextMenuProps extends Pick<RowClickActionContext, 'editorQuery' | 'openInNewTab' | 'dataView' | 'esqlVariables' | 'statsFieldSummary' | 'updateESQLQuery'> {
    row: RowContext;
    close: RowClickActionContext['closeActionMenu'];
}
export declare const useEsqlDataCascadeRowActionHelpers: ({ dataView, esqlVariables, editorQuery, statsFieldSummary, updateESQLQuery, openInNewTab, }: Pick<ContextMenuProps, "dataView" | "esqlVariables" | "editorQuery" | "statsFieldSummary" | "updateESQLQuery" | "openInNewTab">) => {
    renderRowActionPopover: (container?: HTMLElement) => React.JSX.Element | null;
    togglePopover: (this: RowContext, e: React.MouseEvent<Element>) => void;
};
export declare function useEsqlDataCascadeRowHeaderComponents(editorQueryMeta: ESQLStatsQueryMeta, selectedColumns: string[], togglePopover: ReturnType<typeof useEsqlDataCascadeRowActionHelpers>['togglePopover'], columnTypes: Map<string, 'number' | 'array'>): {
    rowHeaderMeta: (props: {
        rowDepth: number;
        rowData: ESQLDataGroupNode;
        nodePath: string[];
    }) => React.ReactNode[];
    rowHeaderTitle: React.FC<{
        rowData: ESQLDataGroupNode;
        nodePath: string[];
    }>;
    rowActions: (params: {
        rowData: ESQLDataGroupNode;
        nodePath: string[];
    }) => import("@kbn/shared-ux-document-data-cascade/src/components/data_cascade_impl/types").CascadeRowActionProps["headerRowActions"];
};
export {};
