import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { type ISearchSource } from '@kbn/data-plugin/common';
import { SearchCursor, type SearchCursorClients, type SearchCursorSettings } from './search_cursor';
export declare class SearchCursorScroll extends SearchCursor {
    private useInternalUser;
    constructor(indexPatternTitle: string, settings: SearchCursorSettings, clients: SearchCursorClients, abortController: AbortController, logger: Logger, useInternalUser?: boolean);
    initialize(): Promise<void>;
    private scan;
    private scroll;
    getPage(searchSource: ISearchSource): Promise<estypes.SearchResponse<any, Record<string, estypes.AggregationsAggregate>>>;
    updateIdFromResults(results: Pick<estypes.SearchResponse<unknown>, '_scroll_id'>): void;
    closeCursor(): Promise<void>;
    getUnableToCloseCursorMessage(): string;
}
