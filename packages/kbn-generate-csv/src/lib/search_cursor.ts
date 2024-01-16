/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { IKibanaSearchResponse, SearchSourceFields } from '@kbn/data-plugin/common';
import type { CsvPagingStrategy } from '../../types';
import type { CsvExportSettings } from './get_export_settings';

interface Clients {
  es: IScopedClusterClient;
}

export type SearchCursorSettings = Pick<
  CsvExportSettings,
  'scroll' | 'includeFrozen' | 'maxConcurrentShardRequests'
>;

export class SearchCursor {
  private strategy: Exclude<CsvPagingStrategy, undefined>;
  private cursorId: string | undefined;
  private searchAfter: estypes.SortResults | undefined;

  constructor(
    private indexPatternTitle: string,
    private settings: SearchCursorSettings,
    private clients: Clients,
    private logger: Logger
  ) {
    this.strategy = settings.scroll.strategy ?? 'pit';
    logger.debug('Using search strategy: ' + this.strategy);
  }

  /**
   * When point-in-time strategy is used, the first step is to open a PIT ID for search context.
   */
  public async initialize() {
    if (this.strategy === 'pit') {
      this.cursorId = await this.openPointInTime();
    }
  }

  private async openPointInTime() {
    const {
      includeFrozen,
      maxConcurrentShardRequests,
      scroll: { duration },
    } = this.settings;
    let pitId: string | undefined;
    this.logger.debug(`Requesting PIT for: [${this.indexPatternTitle}]...`);
    try {
      // NOTE: if ES is overloaded, this request could time out
      const response = await this.clients.es.asCurrentUser.openPointInTime(
        {
          index: this.indexPatternTitle,
          keep_alive: duration,
          ignore_unavailable: true,
          // @ts-expect-error ignore_throttled is not in the type definition, but it is accepted by es
          ignore_throttled: includeFrozen ? false : undefined, // "true" will cause deprecation warnings logged in ES
        },
        {
          requestTimeout: duration,
          maxRetries: 0,
          maxConcurrentShardRequests,
        }
      );
      pitId = response.id;
    } catch (err) {
      this.logger.error(err);
    }

    if (!pitId) {
      throw new Error(`Could not receive a PIT ID!`);
    }

    this.logger.debug(`Opened PIT ID: ${this.formatCursorId(pitId)}`);

    return pitId;
  }

  public doSearchPrior() {
    if (this.strategy === 'pit') {
      this.logger.debug(
        `Executing search request with PIT ID: [${this.formatCursorId(this.cursorId)}]` +
          (this.searchAfter ? ` search_after: [${this.searchAfter}]` : '')
      );
    }
  }

  /**
   * Safely logs debugging meta info from search results
   * @param clientDetails: Details from the data.search client
   * @param results:       Raw data from ES
   */
  public doSearchPost(
    clientDetails: Omit<IKibanaSearchResponse<unknown>, 'rawResponse'>,
    results: estypes.SearchResponse<unknown>
  ) {
    if (this.strategy === 'pit') {
      const { hits: resultsHits, ...headerWithPit } = results;
      const { hits, ...hitsMeta } = resultsHits;
      const trackedTotal = resultsHits.total as estypes.SearchTotalHits;
      const currentTotal = trackedTotal?.value ?? resultsHits.total;

      const totalAccuracy = trackedTotal?.relation ?? 'unknown';
      this.logger.debug(`Received total hits: ${currentTotal}. Accuracy: ${totalAccuracy}.`);

      // reconstruct the data.search response (w/out the data) for logging
      const { pit_id: newPitId, ...header } = headerWithPit;
      const logInfo = {
        ...clientDetails,
        rawResponse: {
          ...header,
          hits: hitsMeta,
          pit_id: `${this.formatCursorId(newPitId)}`,
        },
      };
      this.logger.debug(`Result details: ${JSON.stringify(logInfo)}`);
      this.logger.debug(`Received PIT ID: [${this.formatCursorId(results.pit_id)}]`);
    }
  }

  public updateIdFromResults(results: Pick<estypes.SearchResponse<unknown>, 'pit_id'>) {
    if (this.strategy === 'pit') {
      this.cursorId = results.pit_id ?? this.cursorId;
    }
  }

  /**
   * Returns fields to set into a SearchSource so the correct paging parameters are sent in search requests.
   */
  public getPagingFieldsForSearchSource(): [keyof SearchSourceFields, object] | undefined {
    if (this.strategy === 'pit') {
      // set the latest pit, which could be different from the last request
      return ['pit' as const, { id: this.cursorId, keep_alive: this.settings.scroll.duration }];
    }
  }

  /**
   * The searchAfter should be set with a new place to begin the next page of search results.
   * Only necessary when using point-in-time strategy.
   */
  public setSearchAfter(hits: Array<estypes.SearchHit<unknown>>) {
    if (this.strategy === 'pit') {
      // Update last sort results for next query. PIT is used, so the sort results
      // automatically include _shard_doc as a tiebreaker
      this.searchAfter = hits[hits.length - 1]?.sort as estypes.SortResults | undefined;
      this.logger.debug(`Received search_after: [${this.searchAfter}]`);
    }
  }

  public getSearchAfter() {
    return this.searchAfter;
  }

  public async closeCursorId() {
    if (this.strategy === 'pit') {
      if (this.cursorId) {
        this.logger.debug(`Closing PIT ${this.formatCursorId(this.cursorId)}`);
        await this.clients.es.asCurrentUser.closePointInTime({ body: { id: this.cursorId } });
      } else {
        this.logger.warn(`No PIT ID to clear!`);
      }
    }
  }

  /**
   * Method to avoid logging the entire PIT: it could be megabytes long
   */
  private formatCursorId(pitId: string | undefined) {
    const byteSize = pitId ? Buffer.byteLength(pitId, 'utf-8') : 0;
    return pitId?.substring(0, 12) + `[${byteSize} bytes]`;
  }
}
