import type { Dispatch } from 'react';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import type { FiltersBuilderActions } from './reducer';
interface FiltersBuilderContextType {
    dataView: DataView;
    dispatch: Dispatch<FiltersBuilderActions>;
    globalParams: {
        maxDepth: number;
        hideOr: boolean;
    };
    dropTarget: string;
    timeRangeForSuggestionsOverride?: boolean;
    filtersForSuggestions?: Filter[];
    disabled: boolean;
    suggestionsAbstraction?: SuggestionsAbstraction;
}
export declare const FiltersBuilderContextType: React.Context<FiltersBuilderContextType>;
export {};
