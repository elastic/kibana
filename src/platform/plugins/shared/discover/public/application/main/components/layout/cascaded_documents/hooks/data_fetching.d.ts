import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { type ESQLStatsQueryMeta } from '@kbn/esql-utils';
import { type DataCascadeRowProps, type DataCascadeRowCellProps } from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { type ESQLDataGroupNode } from '../blocks';
import type { CascadedDocumentsContext } from '../cascaded_documents_provider';
interface UseGroupedCascadeDataProps extends Pick<UnifiedDataTableProps, 'rows'>, Pick<CascadedDocumentsContext, 'selectedCascadeGroups' | 'esqlVariables'> {
    queryMeta: ESQLStatsQueryMeta;
}
/**
 * Function returns the data for the cascade group.
 */
export declare const useGroupedCascadeData: ({ selectedCascadeGroups, rows, queryMeta, esqlVariables, }: UseGroupedCascadeDataProps) => {
    data: ESQLDataGroupNode[];
    columnTypes: Map<string, "number" | "array">;
};
export declare function useDataCascadeRowExpansionHandlers({ dataView, }: {
    dataView: DataView;
}): Pick<DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>, 'onCascadeGroupNodeExpanded' | 'onCascadeGroupNodeCollapsed'> & Pick<DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>, 'onCascadeLeafNodeExpanded' | 'onCascadeLeafNodeCollapsed'>;
export {};
