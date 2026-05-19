import type { DocumentDiffMode } from '../types';
export declare const FIELD_NAME_CLASS = "unifiedDataTable__comparisonFieldName";
export declare const BASE_CELL_CLASS = "unifiedDataTable__comparisonBaseDocCell";
export declare const MATCH_CELL_CLASS = "unifiedDataTable__comparisonMatchCell";
export declare const DIFF_CELL_CLASS = "unifiedDataTable__comparisonDiffCell";
export declare const SEGMENT_CLASS = "unifiedDataTable__comparisonSegment";
export declare const ADDED_SEGMENT_CLASS = "unifiedDataTable__comparisonAddedSegment";
export declare const REMOVED_SEGMENT_CLASS = "unifiedDataTable__comparisonRemovedSegment";
export declare const useComparisonCss: ({ diffMode, showDiffDecorations, }: {
    diffMode?: DocumentDiffMode;
    showDiffDecorations?: boolean;
}) => import("@emotion/react").SerializedStyles;
