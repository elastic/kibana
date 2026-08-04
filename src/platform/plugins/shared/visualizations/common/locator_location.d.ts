import type { VisualizeLocatorParams } from './locator';
export declare function getLocation({ visId, timeRange, filters, refreshInterval, linked, uiState, query, vis, savedSearchId, indexPattern, }: VisualizeLocatorParams): Promise<{
    app: string;
    path: string;
    state: {};
}>;
