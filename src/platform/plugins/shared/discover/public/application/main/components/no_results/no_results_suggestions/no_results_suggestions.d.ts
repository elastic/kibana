import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { type Query, type AggregateQuery, type Filter } from '@kbn/es-query';
import type { NoResultsSuggestionWhenFiltersProps } from './no_results_suggestion_when_filters';
interface NoResultsSuggestionProps {
    dataView: DataView;
    isTimeBased?: boolean;
    query: Query | AggregateQuery | undefined;
    filters: Filter[] | undefined;
    onDisableFilters: NoResultsSuggestionWhenFiltersProps['onDisableFilters'];
}
export declare const NoResultsSuggestions: React.FC<NoResultsSuggestionProps>;
export {};
