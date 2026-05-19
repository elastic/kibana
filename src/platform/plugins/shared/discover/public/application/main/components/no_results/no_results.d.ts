import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
export interface DiscoverNoResultsProps {
    isTimeBased?: boolean;
    query: Query | AggregateQuery | undefined;
    filters: Filter[] | undefined;
    dataView: DataView;
    onDisableFilters: () => void;
}
export declare function DiscoverNoResults({ isTimeBased, query, filters, dataView, onDisableFilters, }: DiscoverNoResultsProps): React.JSX.Element;
