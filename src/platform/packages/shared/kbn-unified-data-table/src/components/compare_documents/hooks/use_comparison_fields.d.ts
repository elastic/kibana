import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta } from '@kbn/discover-utils/types';
import type { DocMap } from '../../../types';
export declare const MAX_COMPARISON_FIELDS = 250;
export interface UseComparisonFieldsProps {
    dataView: DataView;
    columnsMeta: DataTableColumnsMeta | undefined;
    selectedFieldNames: string[];
    selectedDocIds: string[];
    showAllFields: boolean;
    showMatchingValues: boolean;
    docMap: DocMap;
}
export declare const useComparisonFields: ({ dataView, columnsMeta, selectedFieldNames, selectedDocIds, showAllFields, showMatchingValues, docMap, }: UseComparisonFieldsProps) => {
    comparisonFields: string[];
    totalFields: number;
};
