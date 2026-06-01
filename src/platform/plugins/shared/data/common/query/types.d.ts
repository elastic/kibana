import type { Query, Filter } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-service-server';
import type { TimeRange } from './timefilter/types';
export type { TimeRange, TimeRangeBounds } from './timefilter/types';
export type { Query, AggregateQuery } from '@kbn/es-query';
export type { RefreshInterval } from '@kbn/data-service-server';
export type SavedQueryTimeFilter = TimeRange & {
    refreshInterval: RefreshInterval;
};
export interface SavedQuery {
    id: string;
    attributes: SavedQueryAttributes;
    namespaces: string[];
}
export interface SavedQueryAttributes {
    title: string;
    description: string;
    query: Query;
    filters?: Filter[];
    timefilter?: SavedQueryTimeFilter;
}
