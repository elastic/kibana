import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
export declare const MAX_COMPARISON_FIELDS = 250;
export interface UseComparisonFieldsProps {
    dataView: DataView;
    selectedFieldNames: string[];
    selectedDocIds: string[];
    showAllFields: boolean;
    showMatchingValues: boolean;
    getDocById: (id: string) => DataTableRecord | undefined;
}
export declare const useComparisonFields: ({ dataView, selectedFieldNames, selectedDocIds, showAllFields, showMatchingValues, getDocById, }: UseComparisonFieldsProps) => {
    comparisonFields: string[];
    totalFields: number;
};
