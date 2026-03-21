import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { type Filter } from '@kbn/es-query';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
export interface FiltersBuilderProps {
    filters: Filter[];
    dataView: DataView;
    onChange: (filters: Filter[]) => void;
    timeRangeForSuggestionsOverride?: boolean;
    filtersForSuggestions?: Filter[];
    maxDepth?: number;
    hideOr?: boolean;
    disabled?: boolean;
    suggestionsAbstraction?: SuggestionsAbstraction;
    filtersCount?: number;
}
export declare function FiltersBuilder({ onChange, dataView, filters, timeRangeForSuggestionsOverride, filtersForSuggestions, maxDepth, hideOr, disabled, suggestionsAbstraction, filtersCount, }: FiltersBuilderProps): React.JSX.Element;
