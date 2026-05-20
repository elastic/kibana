import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ISearchClient, IKibanaSearchResponse, IEsSearchResponse } from '@kbn/search-types';
import type { ISearchSource } from '@kbn/data-plugin/common';
import type { CsvExportSettings } from './get_export_settings';
export interface SearchCursorClients {
    data: ISearchClient;
    es: IScopedClusterClient;
}
export type SearchCursorSettings = Pick<CsvExportSettings, 'scroll' | 'includeFrozen' | 'maxConcurrentShardRequests' | 'taskInstanceFields'>;
export declare abstract class SearchCursor {
    protected indexPatternTitle: string;
    protected settings: SearchCursorSettings;
    protected clients: SearchCursorClients;
    protected abortController: AbortController;
    protected logger: Logger;
    protected cursorId: string | undefined;
    constructor(indexPatternTitle: string, settings: SearchCursorSettings, clients: SearchCursorClients, abortController: AbortController, logger: Logger);
    abstract initialize(): Promise<void>;
    abstract getPage(searchSource: ISearchSource): Promise<IEsSearchResponse['rawResponse'] | undefined>;
    abstract updateIdFromResults(results: Pick<estypes.SearchResponse<unknown>, '_scroll_id' | 'pit_id' | 'hits'>): void;
    abstract closeCursor(): Promise<void>;
    abstract getUnableToCloseCursorMessage(): string;
    /**
     * Safely logs debugging meta info from search results
     * @param clientDetails: Details from the data.search client
     * @param results:       Raw data from ES
     */
    protected logSearchResults(clientDetails: Omit<IKibanaSearchResponse<unknown>, 'rawResponse'>, results: estypes.SearchResponse<unknown>): void;
    /**
     * Method to avoid logging the entire PIT: it could be megabytes long
     */
    protected formatCursorId(cursorId: string | undefined): string;
}
