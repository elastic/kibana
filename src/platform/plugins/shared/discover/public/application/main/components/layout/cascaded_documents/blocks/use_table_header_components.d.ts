import React from 'react';
interface UseTableHeaderProps {
    viewModeToggle: React.ReactElement | undefined;
    cascadeGroupingChangeHandler: (cascadeGrouping: string[]) => void;
}
interface GroupBySelectorRendererProps {
    width?: number;
    cascadeGroupingChangeHandler: (cascadeGrouping: string[]) => void;
}
/**
 * Renders the "Group By" selector used in the data cascade header.
 */
export declare function useGetGroupBySelectorRenderer({ cascadeGroupingChangeHandler, }: GroupBySelectorRendererProps): (availableColumns: string[], currentSelectedColumns: string[]) => React.JSX.Element;
export declare function useEsqlDataCascadeHeaderComponent({ viewModeToggle, cascadeGroupingChangeHandler, }: UseTableHeaderProps): (props: {
    availableColumns: string[];
    currentSelectedColumns: string[];
    onGroupSelection: (groupByColumn: string[]) => void;
    selectedRows: string[];
}) => React.ReactNode;
export {};
