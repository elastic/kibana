/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';
import { FetchStatus } from '../application/types';
import { sendLoadingMsg } from '../application/main/hooks/use_saved_search_messages';
import type { SavedSearchData } from '../application/main/state_management/discover_data_state_container';
import { fetchEsql, type FetchEsqlParams } from '../application/main/data_fetching/fetch_esql';

interface EsqlDocumentCacheReference {
  sessionId: string;
  timeRangeAbsolute: TimeRange;
  selectedTimeRange: TimeRange;
}

interface PreviousDocumentsFetch {
  markFreshSettled: () => void;
  wasPublished: () => boolean;
}

export interface EsqlDocumentsFetch {
  freshResponse: ReturnType<typeof fetchEsql>;
  hasPreviousResult: boolean;
  wasPreviousResultPublished: () => boolean;
}

export interface EsqlDocumentsFetchParams {
  dataSubjects: SavedSearchData;
  enabled: boolean;
  freshRequest: FetchEsqlParams;
  freshResponse: ReturnType<typeof fetchEsql>;
  isCurrentFetch: () => boolean;
  selectedTimeRange: TimeRange | undefined;
  tabId: string;
}

const hasSameSelectedTimeRange = (
  entry: EsqlDocumentCacheReference,
  selectedTimeRange: TimeRange | undefined
) =>
  selectedTimeRange?.from === entry.selectedTimeRange.from &&
  selectedTimeRange?.to === entry.selectedTimeRange.to;

export class EsqlDocumentCache {
  private readonly entries = new Map<string, EsqlDocumentCacheReference>();

  public dispose() {
    this.entries.clear();
  }

  public disposeTab(tabId: string, sessionId?: string) {
    const entry = this.entries.get(tabId);
    if (entry && (!sessionId || entry.sessionId === sessionId)) {
      this.entries.delete(tabId);
    }
  }

  public manage({
    dataSubjects,
    enabled,
    freshRequest,
    freshResponse,
    isCurrentFetch,
    selectedTimeRange,
    tabId,
  }: EsqlDocumentsFetchParams): EsqlDocumentsFetch {
    const previousResult = this.fetchPrevious({
      enabled,
      tabId,
      dataSubjects,
      freshRequest,
      selectedTimeRange,
    });

    const managedFreshResponse = freshResponse
      .then((result) => {
        previousResult?.markFreshSettled();

        const hasIncompleteWarning = result.interceptedWarnings?.some(
          ({ type }) => type === 'incomplete'
        );
        if (
          !hasIncompleteWarning &&
          isCurrentFetch() &&
          freshRequest.searchSessionId &&
          freshRequest.timeRange &&
          selectedTimeRange
        ) {
          this.storeReference(
            tabId,
            freshRequest.searchSessionId,
            freshRequest.timeRange,
            selectedTimeRange
          );
        }

        return result;
      })
      .catch((error) => {
        previousResult?.markFreshSettled();
        if (!freshRequest.abortSignal?.aborted && isCurrentFetch()) {
          this.disposeTab(tabId);
        }
        throw error;
      });

    return {
      freshResponse: managedFreshResponse,
      hasPreviousResult: Boolean(previousResult),
      wasPreviousResultPublished: () => previousResult?.wasPublished() ?? false,
    };
  }

  private storeReference(
    tabId: string,
    sessionId: string,
    timeRangeAbsolute: TimeRange,
    selectedTimeRange: TimeRange
  ) {
    this.entries.set(tabId, {
      sessionId,
      timeRangeAbsolute,
      selectedTimeRange,
    });
  }

  private fetchPrevious({
    enabled,
    tabId,
    dataSubjects,
    freshRequest,
    selectedTimeRange,
  }: {
    enabled: boolean;
    tabId: string;
    dataSubjects: SavedSearchData;
    freshRequest: FetchEsqlParams;
    selectedTimeRange: TimeRange | undefined;
  }): PreviousDocumentsFetch | undefined {
    if (!enabled) {
      return;
    }

    const entry = this.entries.get(tabId);
    if (!entry) {
      return;
    }

    if (!hasSameSelectedTimeRange(entry, selectedTimeRange)) {
      // The old absolute range is only a valid seed for the same user-selected range.
      this.entries.delete(tabId);
      return;
    }

    let freshSettled = false;
    let published = false;
    const discard = () => this.disposeTab(tabId, entry.sessionId);
    const fallBackToLoading = () => {
      discard();

      if (!freshSettled && !freshRequest.abortSignal?.aborted) {
        sendLoadingMsg(dataSubjects.main$);
      }
    };

    // The old session ID usually replays Data's response cache. If that entry was
    // evicted, Data may run this request; the concurrent fresh request still wins.
    void fetchEsql({
      ...freshRequest,
      inspectorAdapters: {},
      timeRange: entry.timeRangeAbsolute,
      searchSessionId: entry.sessionId,
    })
      .then(({ records, esqlQueryColumns, interceptedWarnings = [], esqlHeaderWarning }) => {
        if (freshSettled || freshRequest.abortSignal?.aborted) {
          return;
        }

        if (interceptedWarnings.some(({ type }) => type === 'incomplete')) {
          fallBackToLoading();
          return;
        }

        published = true;
        dataSubjects.totalHits$.next({
          fetchStatus: FetchStatus.COMPLETE,
          result: records.length,
        });
        dataSubjects.documents$.next({
          fetchStatus: FetchStatus.COMPLETE,
          result: records,
          esqlQueryColumns,
          esqlHeaderWarning,
          interceptedWarnings,
          query: freshRequest.query,
          resultSource: 'previous',
          isBackgroundRevalidation: true,
        });
        dataSubjects.main$.next({
          fetchStatus: FetchStatus.PARTIAL,
          foundDocuments: records.length > 0,
        });
      })
      .catch(fallBackToLoading);

    return {
      markFreshSettled: () => {
        freshSettled = true;
      },
      wasPublished: () => published,
    };
  }
}
