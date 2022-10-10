/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { BehaviorSubject, Subject } from 'rxjs';

import {
  DataViewsServicePublic,
  MatchedItem,
  DataViewsPublicPluginStart,
  INDEX_PATTERN_TYPE,
  DataViewField,
} from '@kbn/data-views-plugin/public';

import { RollupIndicesCapsResponse, MatchedIndicesSet, TimestampOption } from './types';
import { getMatchedIndices, ensureMinimumTime, extractTimeFields } from './lib';
import { GetFieldsOptions } from './shared_imports';

export class DataViewEditorService {
  constructor(private http: HttpSetup, private dataViews: DataViewsServicePublic) {
    this.rollupCapsResponse = this.getRollupIndexCaps();
  }

  rollupIndicesCapabilities$ = new BehaviorSubject<RollupIndicesCapsResponse>({});
  isLoadingSources$ = new BehaviorSubject<boolean>(false);

  loadingTimestampFields$ = new BehaviorSubject<boolean>(false);
  timestampFieldOptions$ = new Subject<TimestampOption[]>();

  matchedIndices$ = new BehaviorSubject<MatchedIndicesSet>({
    allIndices: [],
    exactMatchedIndices: [],
    partialMatchedIndices: [],
    visibleIndices: [],
  });

  private rollupCapsResponse: Promise<RollupIndicesCapsResponse>;

  private currentLoadingTimestampFields = 0;

  private getRollupIndexCaps = async () => {
    let response: RollupIndicesCapsResponse = {};
    try {
      response = await this.http.get<RollupIndicesCapsResponse>('/api/rollup/indices');
    } catch (e) {
      // Silently swallow failure responses such as expired trials
    }
    this.rollupIndicesCapabilities$.next(response);
    return response;
  };

  private getRollupIndices = (rollupCaps: RollupIndicesCapsResponse) => Object.keys(rollupCaps);

  getIsRollupIndex = async () => {
    const response = await this.rollupCapsResponse;
    return (indexName: string) => this.getRollupIndices(response).includes(indexName);
  };

  loadMatchedIndices = async (
    query: string,
    allowHidden: boolean,
    allSources: MatchedItem[],
    {
      isRollupIndex,
      dataViews,
    }: {
      isRollupIndex: (index: string) => boolean;
      dataViews: DataViewsPublicPluginStart;
    }
  ): Promise<{
    matchedIndicesResult: MatchedIndicesSet;
    exactMatched: MatchedItem[];
    partialMatched: MatchedItem[];
  }> => {
    const indexRequests = [];

    if (query?.endsWith('*')) {
      const exactMatchedQuery = dataViews.getIndices({
        isRollupIndex,
        pattern: query,
        showAllIndices: allowHidden,
      });
      indexRequests.push(exactMatchedQuery);
      // provide default value when not making a request for the partialMatchQuery
      indexRequests.push(Promise.resolve([]));
    } else {
      const exactMatchQuery = dataViews.getIndices({
        isRollupIndex,
        pattern: query,
        showAllIndices: allowHidden,
      });
      const partialMatchQuery = dataViews.getIndices({
        isRollupIndex,
        pattern: `${query}*`,
        showAllIndices: allowHidden,
      });

      indexRequests.push(exactMatchQuery);
      indexRequests.push(partialMatchQuery);
    }

    const [exactMatched, partialMatched] = (await ensureMinimumTime(
      indexRequests
    )) as MatchedItem[][];

    const matchedIndicesResult = getMatchedIndices(
      allSources,
      partialMatched,
      exactMatched,
      allowHidden
    );

    this.matchedIndices$.next(matchedIndicesResult);
    return { matchedIndicesResult, exactMatched, partialMatched };
  };

  loadIndices = async (title: string, allowHidden: boolean) => {
    const isRollupIndex = await this.getIsRollupIndex();
    const allSrcs = await this.dataViews.getIndices({
      isRollupIndex,
      pattern: '*',
      showAllIndices: allowHidden,
    });
    const matchedSet = await this.loadMatchedIndices(title, allowHidden, allSrcs, {
      isRollupIndex,
      dataViews: this.dataViews,
    });

    this.isLoadingSources$.next(false);
    const matchedIndices = getMatchedIndices(
      allSrcs,
      matchedSet.partialMatched,
      matchedSet.exactMatched,
      allowHidden
    );

    this.matchedIndices$.next(matchedIndices);
    return matchedIndices;
  };

  loadDataViewNames = async (dataViewName?: string) => {
    const dataViewListItems = await this.dataViews.getIdsWithTitle(dataViewName ? true : false);
    const dataViewNames = dataViewListItems.map((item) => item.name || item.title);
    return dataViewName ? dataViewNames.filter((v) => v !== dataViewName) : dataViewNames;
  };

  loadTimestampFields = async (
    index: string,
    type: INDEX_PATTERN_TYPE,
    requireTimestampField: boolean,
    rollupIndex?: string
  ) => {
    if (this.matchedIndices$.getValue().exactMatchedIndices.length === 0) {
      this.timestampFieldOptions$.next([]);
      return;
    }
    // console.log('loadTimestampFields', index, type, requireTimestampField, rollupIndex);
    const currentLoadingTimestampFieldsIdx = ++this.currentLoadingTimestampFields;
    this.loadingTimestampFields$.next(true);
    const getFieldsOptions: GetFieldsOptions = {
      pattern: index,
    };
    if (type === INDEX_PATTERN_TYPE.ROLLUP) {
      getFieldsOptions.type = INDEX_PATTERN_TYPE.ROLLUP;
      getFieldsOptions.rollupIndex = rollupIndex;
    }

    const fields = await ensureMinimumTime(this.dataViews.getFieldsForWildcard(getFieldsOptions));
    const timestampOptions = extractTimeFields(fields as DataViewField[], requireTimestampField);
    if (currentLoadingTimestampFieldsIdx === this.currentLoadingTimestampFields) {
      this.timestampFieldOptions$.next(timestampOptions);
      this.loadingTimestampFields$.next(false);
    }
  };
}
