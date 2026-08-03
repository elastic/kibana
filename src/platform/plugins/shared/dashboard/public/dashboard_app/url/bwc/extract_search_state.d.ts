import type { DashboardState } from '../../../../common';
type DashboardSearchState = Pick<DashboardState, 'filters' | 'query' | 'refresh_interval' | 'time_range' | 'esql_approximation'>;
export declare function extractSearchState(state: {
    [key: string]: unknown;
}): Partial<DashboardSearchState>;
export {};
