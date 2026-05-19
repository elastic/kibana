import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { type ISearchSource } from '@kbn/data-plugin/common';
import { SearchCursor, type SearchCursorClients, type SearchCursorSettings } from './search_cursor';
export declare class SearchCursorPit extends SearchCursor {
    private searchAfter;
    private useInternalUser;
    constructor(indexPatternTitle: string, settings: SearchCursorSettings, clients: SearchCursorClients, abortController: AbortController, logger: Logger, useInternalUser?: boolean);
    /**
     * When point-in-time strategy is used, the first step is to open a PIT ID for search context.
     */
    initialize(): Promise<void>;
    protected openPointInTime(): Promise<string>;
    protected searchWithPit(searchBody: estypes.SearchRequest): Promise<import("@kbn/search-types").IEsSearchResponse>;
    getPage(searchSource: ISearchSource): Promise<estypes.SearchResponse<any, Record<string, estypes.AggregationsAggregate>>>;
    updateIdFromResults(results: Pick<estypes.SearchResponse<unknown>, 'pit_id' | 'hits'>): void;
    protected getSearchAfter(): estypes.SortResults | undefined;
    /**
     * For managing the search_after parameter, needed for paging using point-in-time
     */
    protected setSearchAfter(hits: Array<estypes.SearchHit<unknown>>): void;
    closeCursor(): Promise<void>;
    getUnableToCloseCursorMessage(): string;
}
