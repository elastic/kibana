import type { estypes } from '@elastic/elasticsearch';
export interface EqlSearchResponse<T = unknown> extends estypes.SearchResponse<T> {
    id?: string;
    is_partial: boolean;
    is_running: boolean;
}
