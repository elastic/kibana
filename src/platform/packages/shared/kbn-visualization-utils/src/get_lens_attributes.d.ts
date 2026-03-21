import type { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import type { Suggestion } from './types';
export declare const getLensAttributesFromSuggestion: ({ filters, query, suggestion, dataView, }: {
    filters: Filter[];
    query: Query | AggregateQuery;
    suggestion: Suggestion | undefined;
    dataView?: DataView;
}) => {
    references: Array<{
        name: string;
        id: string;
        type: string;
    }>;
    visualizationType: string;
    state: {
        visualization: {};
        datasourceStates: Record<string, unknown>;
        query: Query | AggregateQuery;
        filters: Filter[];
    };
    title: string;
    version: 2;
};
