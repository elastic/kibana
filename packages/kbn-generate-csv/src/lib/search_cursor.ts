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
  ISearchSource,
  SearchRequest,
  SearchSourceFields,
} from '@kbn/data-plugin/common';
import { ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { lastValueFrom } from 'rxjs';
import type { CsvPagingStrategy } from '../../types';
import type { CsvExportSettings } from './get_export_settings';
import { i18nTexts } from './i18n_texts';

interface Clients {
  data: IScopedSearchClient;
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

    // initialization not necessary for scroll strategy
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

  private async searchWithPit(searchBody: SearchRequest) {
    const searchParamsPit = {
      params: {
        body: searchBody,
        max_concurrent_shard_requests: this.settings.maxConcurrentShardRequests,
      },
    };
    return await lastValueFrom(
      this.clients.data.search(searchParamsPit, {
        strategy: ES_SEARCH_STRATEGY,
        transport: {
          maxRetries: 0, // retrying reporting jobs is handled in the task manager scheduling logic
          requestTimeout: this.settings.scroll.duration,
        },
      })
    );
  }

  private async scan(searchBody: SearchRequest) {
    const searchParamsScan = {
      params: {
        body: searchBody,
        index: this.indexPatternTitle,
        scroll: this.settings.scroll.duration,
        size: this.settings.scroll.size,
        ignore_throttled: this.settings.includeFrozen ? false : undefined, // "true" will cause deprecation warnings logged in ES
      },
    };

    return await lastValueFrom(
      this.clients.data.search(searchParamsScan, {
        strategy: ES_SEARCH_STRATEGY,
        transport: {
          maxRetries: 0, // retrying reporting jobs is handled in the task manager scheduling logic
          requestTimeout: this.settings.scroll.duration,
        },
      })
    );
  }

  private async scroll() {
    return await this.clients.es.asCurrentUser.scroll(
      {
        scroll: this.settings.scroll.duration,
        scroll_id: this.cursorId,
      },
      {
        maxRetries: 0, // retrying reporting jobs is handled in the task manager scheduling logic
        requestTimeout: this.settings.scroll.duration,
      }
    );
  }

  private doSearchPrior() {
    if (this.strategy === 'pit') {
      this.logger.debug(
        `Executing search request with PIT ID: [${this.formatCursorId(this.cursorId)}]` +
          (this.searchAfter ? ` search_after: [${this.searchAfter}]` : '')
      );
    } else {
      if (this.cursorId) {
        this.logger.debug(
          `Executing search request with scroll ID [${this.formatCursorId(this.cursorId)}]`
        );
      } else {
        this.logger.debug(`Executing search for initial scan request.`);
      }
    }
  }

  /**
   * Safely logs debugging meta info from search results
   * @param clientDetails: Details from the data.search client
   * @param results:       Raw data from ES
   */
  private doSearchPost(
    clientDetails: Omit<IKibanaSearchResponse<unknown>, 'rawResponse'>,
    results: estypes.SearchResponse<unknown>
  ) {
    const { hits: resultsHits, ...headerWithPit } = results;
    const { hits, ...hitsMeta } = resultsHits;
    const trackedTotal = resultsHits.total as estypes.SearchTotalHits;
    const currentTotal = trackedTotal?.value ?? resultsHits.total;

    const totalAccuracy = trackedTotal?.relation ?? 'unknown';
    this.logger.debug(`Received total hits: ${currentTotal}. Accuracy: ${totalAccuracy}.`);

    // reconstruct the data.search response (w/out the data) for logging
    const { pit_id: newPitId, _scroll_id: newScrollId, ...header } = headerWithPit;
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
    if (this.strategy === 'pit') {
      this.logger.debug(`Received PIT ID: [${this.formatCursorId(newPitId)}]`);
    } else {
      this.logger.debug(`Received Scroll ID: [${this.formatCursorId(newScrollId)}]`);
    }
  }

  public async getPage(searchSource: ISearchSource) {
    this.doSearchPrior();

    let response: IEsSearchResponse | undefined;

    const searchBody: estypes.SearchRequest = searchSource.getSearchRequestBody();
    if (searchBody == null) {
      throw new Error('Could not retrieve the search body!');
    }

    if (this.strategy === 'pit') {
      response = await this.searchWithPit(searchBody);
    } else if (this.strategy === 'scroll' && this.cursorId == null) {
      response = await this.scan(searchBody);
    } else if (this.strategy === 'scroll') {
      response = { rawResponse: await this.scroll() };
    }

    if (!response) {
      throw new Error(`Response could not be retrieved!`);
    }

    const { rawResponse, ...rawDetails } = response;

    this.doSearchPost(rawDetails, rawResponse);

    return rawResponse;
  }

  public updateIdFromResults(
    results: Pick<estypes.SearchResponse<unknown>, 'pit_id' | '_scroll_id'>
  ) {
    let cursorId: string | undefined;
    if (this.strategy === 'pit') {
      cursorId = results.pit_id;
    } else {
      cursorId = results._scroll_id;
    }
    this.cursorId = cursorId ?? this.cursorId;
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
    if (this.cursorId) {
      if (this.strategy === 'pit') {
        this.logger.debug(`Executing close PIT on ${this.formatCursorId(this.cursorId)}`);
        await this.clients.es.asCurrentUser.closePointInTime({ body: { id: this.cursorId } });
      } else {
        this.logger.debug(`Executing clearScroll on ${this.formatCursorId(this.cursorId)}`);
        await this.clients.es.asCurrentUser.clearScroll({ scroll_id: [this.cursorId] });
      }
    } else {
      this.logger.warn(`No ${this.strategy}Id to clear!`);
    }
  }

  public getUnableToCloseCursorMessage() {
    if (this.strategy === 'pit') {
      return i18nTexts.csvUnableToClosePit();
    } else {
      return i18nTexts.csvUnableToCloseScroll();
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
