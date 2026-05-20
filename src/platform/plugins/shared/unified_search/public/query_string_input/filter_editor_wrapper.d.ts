import React from 'react';
import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
interface QueryDslFilter {
    queryDsl: string;
    customLabel: string | null;
}
interface FilterEditorWrapperProps {
    indexPatterns?: Array<DataView | string>;
    filters: Filter[];
    timeRangeForSuggestionsOverride?: boolean;
    filtersForSuggestions?: Filter[];
    closePopoverOnAdd?: () => void;
    closePopoverOnCancel?: () => void;
    onFiltersUpdated?: (filters: Filter[]) => void;
    onLocalFilterUpdate?: (filter: Filter | QueryDslFilter) => void;
    onLocalFilterCreate?: (initialState: {
        filter: Filter;
        queryDslFilter: QueryDslFilter;
    }) => void;
    suggestionsAbstraction?: SuggestionsAbstraction;
}
export declare const FilterEditorWrapper: React.NamedExoticComponent<FilterEditorWrapperProps>;
export {};
