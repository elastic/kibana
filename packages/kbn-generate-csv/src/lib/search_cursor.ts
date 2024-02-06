/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type {
  IEsSearchResponse,
  IKibanaSearchResponse,
  ISearchClient,
  ISearchSource,
} from '@kbn/data-plugin/common';
import type { CsvExportSettings } from './get_export_settings';

export interface SearchCursorClients {
  data: ISearchClient;
  es: IScopedClusterClient;
}

export type SearchCursorSettings = Pick<
  CsvExportSettings,
  'scroll' | 'includeFrozen' | 'maxConcurrentShardRequests' | 'taskInstanceFields'
>;

export abstract class SearchCursor {
  protected cursorId: string | undefined;

  constructor(
    protected indexPatternTitle: string,
    protected settings: SearchCursorSettings,
    protected clients: SearchCursorClients,
    protected abortController: AbortController,
    protected logger: Logger
  ) {}

  public abstract initialize(): Promise<void>;

  public abstract getPage(
    searchSource: ISearchSource
  ): Promise<IEsSearchResponse['rawResponse'] | undefined>;

  public abstract updateIdFromResults(
    results: Pick<estypes.SearchResponse<unknown>, '_scroll_id' | 'pit_id' | 'hits'>
  ): void;

  public abstract closeCursor(): Promise<void>;

  public abstract getUnableToCloseCursorMessage(): string;

  /**
   * Safely logs debugging meta info from search results
   * @param clientDetails: Details from the data.search client
   * @param results:       Raw data from ES
   */
  protected logSearchResults(
    clientDetails: Omit<IKibanaSearchResponse<unknown>, 'rawResponse'>,
    results: estypes.SearchResponse<unknown>
  ) {
    const { hits: resultsHits, ...headerWithCursor } = results;
    const { hits, ...hitsMeta } = resultsHits;
    const trackedTotal = resultsHits.total as estypes.SearchTotalHits;
    const currentTotal = trackedTotal?.value ?? resultsHits.total;

    const totalAccuracy = trackedTotal?.relation ?? 'unknown';
    this.logger.debug(`Received total hits: ${currentTotal}. Accuracy: ${totalAccuracy}.`);

    // reconstruct the data.search response (w/out the data) for logging
    const { pit_id: newPitId, _scroll_id: newScrollId, ...header } = headerWithCursor;
    const logInfo = {
      ...clientDetails,
      rawResponse: {
        ...header,
        hits: hitsMeta,
        pit_id: newPitId ? `${this.formatCursorId(newPitId)}` : undefined,
        _scroll_id: newScrollId ? `${this.formatCursorId(newScrollId)}` : undefined,
      },
    };
    this.logger.debug(`Result details: ${JSON.stringify(logInfo)}`);
  }

  /**
   * Method to avoid logging the entire PIT: it could be megabytes long
   */
  protected formatCursorId(cursorId: string | undefined) {
    const byteSize = cursorId ? Buffer.byteLength(cursorId, 'utf-8') : 0;
    return cursorId?.substring(0, 12) + `[${byteSize} bytes]`;
  }
}
