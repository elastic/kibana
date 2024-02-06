/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { lastValueFrom } from 'rxjs';
import {
  ES_SEARCH_STRATEGY,
  type ISearchSource,
  type SearchRequest,
} from '@kbn/data-plugin/common';
import { SearchCursor, type SearchCursorClients, type SearchCursorSettings } from './search_cursor';
import { i18nTexts } from './i18n_texts';

export class SearchCursorPit extends SearchCursor {
  private searchAfter: estypes.SortResults | undefined;

  constructor(
    indexPatternTitle: string,
    settings: SearchCursorSettings,
    clients: SearchCursorClients,
    abortController: AbortController,
    logger: Logger
  ) {
    super(indexPatternTitle, settings, clients, abortController, logger);
  }

  /**
   * When point-in-time strategy is used, the first step is to open a PIT ID for search context.
   */
  public async initialize() {
    this.cursorId = await this.openPointInTime();
  }

  private async openPointInTime() {
    const { includeFrozen, maxConcurrentShardRequests, scroll, taskInstanceFields } = this.settings;

    let pitId: string | undefined;

    this.logger.debug(`Requesting PIT for: [${this.indexPatternTitle}]...`);
    try {
      // NOTE: if ES is overloaded, this request could time out
      const response = await this.clients.es.asCurrentUser.openPointInTime(
        {
          index: this.indexPatternTitle,
          keep_alive: scroll.duration(taskInstanceFields),
          ignore_unavailable: true,
          // @ts-expect-error ignore_throttled is not in the type definition, but it is accepted by es
          ignore_throttled: includeFrozen ? false : undefined, // "true" will cause deprecation warnings logged in ES
        },
        {
          signal: this.abortController.signal,
          requestTimeout: scroll.duration(taskInstanceFields),
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
    const { maxConcurrentShardRequests, scroll, taskInstanceFields } = this.settings;

    const searchParamsPit = {
      params: {
        body: searchBody,
        max_concurrent_shard_requests: maxConcurrentShardRequests,
      },
    };

    return await lastValueFrom(
      this.clients.data.search(searchParamsPit, {
        strategy: ES_SEARCH_STRATEGY,
        abortSignal: this.abortController.signal,
        transport: {
          maxRetries: 0, // retrying reporting jobs is handled in the task manager scheduling logic
          requestTimeout: scroll.duration(taskInstanceFields),
        },
      })
    );
  }

  public async getPage(searchSource: ISearchSource) {
    const { scroll, taskInstanceFields } = this.settings;

    if (!this.cursorId) {
      throw new Error(`No access to valid PIT ID!`);
    }

    searchSource.setField('pit', {
      id: this.cursorId,
      keep_alive: scroll.duration(taskInstanceFields),
    });

    const searchAfter = this.getSearchAfter();
    if (searchAfter) {
      searchSource.setField('searchAfter', searchAfter);
    }

    this.logger.debug(
      `Executing search request with PIT ID: [${this.formatCursorId(this.cursorId)}]` +
        (searchAfter ? ` search_after: [${searchAfter}]` : '')
    );

    const searchBody: estypes.SearchRequest = searchSource.getSearchRequestBody();
    if (searchBody == null) {
      throw new Error('Could not retrieve the search body!');
    }

    const response = await this.searchWithPit(searchBody);

    if (!response) {
      throw new Error(`Response could not be retrieved!`);
    }

    const { rawResponse, ...rawDetails } = response;

    this.logSearchResults(rawDetails, rawResponse);
    this.logger.debug(`Received PIT ID: [${this.formatCursorId(rawResponse.pit_id)}]`);

    return rawResponse;
  }

  public updateIdFromResults(results: Pick<estypes.SearchResponse<unknown>, 'pit_id' | 'hits'>) {
    const cursorId = results.pit_id;
    this.cursorId = cursorId ?? this.cursorId;

    // track the beginning of the next page of search results
    const { hits } = results.hits;
    this.setSearchAfter(hits); // for pit only
  }

  private getSearchAfter() {
    return this.searchAfter;
  }

  /**
   * For managing the search_after parameter, needed for paging using point-in-time
   */
  private setSearchAfter(hits: Array<estypes.SearchHit<unknown>>) {
    // Update last sort results for next query. PIT is used, so the sort results
    // automatically include _shard_doc as a tiebreaker
    this.searchAfter = hits[hits.length - 1]?.sort as estypes.SortResults | undefined;
    this.logger.debug(`Received search_after: [${this.searchAfter}]`);
  }

  public async closeCursor() {
    if (this.cursorId) {
      this.logger.debug(`Executing close PIT on ${this.formatCursorId(this.cursorId)}`);
      await this.clients.es.asCurrentUser.closePointInTime({ body: { id: this.cursorId } });
    } else {
      this.logger.warn(`No PIT Id to clear!`);
    }
  }

  public getUnableToCloseCursorMessage() {
    return i18nTexts.csvUnableToClosePit();
  }
}
