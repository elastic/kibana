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

  rollupIndex$ = new BehaviorSubject<string | undefined>(undefined);

  matchedIndices$ = new BehaviorSubject<MatchedIndicesSet>({
    allIndices: [],
    exactMatchedIndices: [],
    partialMatchedIndices: [],
    visibleIndices: [],
  });

  private rollupCapsResponse: Promise<RollupIndicesCapsResponse>;

  private currentLoadingTimestampFields = 0;
  private currentLoadingMatchedIndices = 0;

  // todo call only once per display of modal
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

  // todo hopefully don't use return value
  loadMatchedIndices = async (
    query: string,
    allowHidden: boolean,
    allSources: MatchedItem[],
    type: INDEX_PATTERN_TYPE
  ): Promise<{
    matchedIndicesResult: MatchedIndicesSet;
    exactMatched: MatchedItem[];
    partialMatched: MatchedItem[];
  }> => {
    const currentLoadingMatchedIndicesIdx = ++this.currentLoadingMatchedIndices;
    const isRollupIndex = await this.getIsRollupIndex();
    const indexRequests = [];
    let newRollupIndexName: string | undefined;
    console.log('loadMatchedIndices', query, allowHidden, allSources, type);

    if (query?.endsWith('*')) {
      const exactMatchedQuery = this.getIndicesCached({
        // might need to add isRollupIndex
        pattern: query,
        showAllIndices: allowHidden,
      });

      indexRequests.push(exactMatchedQuery);
      // provide default value when not making a request for the partialMatchQuery
      indexRequests.push(Promise.resolve([]));
    } else {
      const exactMatchQuery = this.getIndicesCached({
        // might need to add isRollupIndex
        pattern: query,
        showAllIndices: allowHidden,
      });
      const partialMatchQuery = this.getIndicesCached({
        // might need to add isRollupIndex
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

    if (currentLoadingMatchedIndicesIdx === this.currentLoadingMatchedIndices) {
      // we are still interested in this result
      if (type === INDEX_PATTERN_TYPE.ROLLUP) {
        const rollupIndices = exactMatched.filter((index) => isRollupIndex(index.name));
        newRollupIndexName = rollupIndices.length === 1 ? rollupIndices[0].name : undefined;
        this.rollupIndex$.next(newRollupIndexName);
      } else {
        this.rollupIndex$.next(undefined);
      }

      // todo
      // loadingMatchedIndices$.current.next(false);

      this.matchedIndices$.next(matchedIndicesResult);
      return { matchedIndicesResult, exactMatched, partialMatched };
    }
    // return undefined;
  };

  loadIndices = async (title: string, allowHidden: boolean, type: INDEX_PATTERN_TYPE) => {
    const isRollupIndex = await this.getIsRollupIndex();
    const allSrcs = await this.dataViews.getIndices({
      isRollupIndex,
      pattern: '*',
      showAllIndices: allowHidden,
    });
    // todo look at this
    const { matchedIndicesResult } = await this.loadMatchedIndices(
      title,
      allowHidden,
      allSrcs,
      type
    );

    this.isLoadingSources$.next(false);

    this.matchedIndices$.next(matchedIndicesResult);
    return matchedIndicesResult;
  };

  loadDataViewNames = async (dataViewName?: string) => {
    const dataViewListItems = await this.dataViews.getIdsWithTitle(dataViewName ? true : false);
    const dataViewNames = dataViewListItems.map((item) => item.name || item.title);
    return dataViewName ? dataViewNames.filter((v) => v !== dataViewName) : dataViewNames;
  };

  private getIndicesMemory: Record<string, Promise<MatchedItem[]>> = {};
  getIndicesCached = async (props: { pattern: string; showAllIndices?: boolean | undefined }) => {
    const key = JSON.stringify(props);

    const getIndicesPromise = this.getIsRollupIndex().then((isRollupIndex) =>
      this.dataViews.getIndices({ ...props, isRollupIndex })
    );
    this.getIndicesMemory[key] = this.getIndicesMemory[key] || getIndicesPromise;

    getIndicesPromise.catch(() => {
      delete this.getIndicesMemory[key];
    });

    return await getIndicesPromise;
  };

  private timeStampOptionsMemory: Record<string, Promise<TimestampOption[]>> = {};
  private getTimestampOptionsForWildcard = async (
    getFieldsOptions: GetFieldsOptions,
    requireTimestampField: boolean
  ) => {
    const fields = await ensureMinimumTime(this.dataViews.getFieldsForWildcard(getFieldsOptions));
    return extractTimeFields(fields as DataViewField[], requireTimestampField);
  };

  private getTimestampOptionsForWildcardCached = async (
    getFieldsOptions: GetFieldsOptions,
    requireTimestampField: boolean
  ) => {
    const key = JSON.stringify(getFieldsOptions) + requireTimestampField;

    const getTimestampOptionsPromise = this.getTimestampOptionsForWildcard(
      getFieldsOptions,
      requireTimestampField
    );
    this.timeStampOptionsMemory[key] =
      this.timeStampOptionsMemory[key] || getTimestampOptionsPromise;

    getTimestampOptionsPromise.catch(() => {
      delete this.timeStampOptionsMemory[key];
    });

    return await getTimestampOptionsPromise;
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
    const currentLoadingTimestampFieldsIdx = ++this.currentLoadingTimestampFields;
    this.loadingTimestampFields$.next(true);
    const getFieldsOptions: GetFieldsOptions = {
      pattern: index,
    };
    if (type === INDEX_PATTERN_TYPE.ROLLUP) {
      getFieldsOptions.type = INDEX_PATTERN_TYPE.ROLLUP;
      getFieldsOptions.rollupIndex = rollupIndex;
    }

    let timestampOptions: TimestampOption[] = [];
    try {
      timestampOptions = await this.getTimestampOptionsForWildcardCached(
        getFieldsOptions,
        requireTimestampField
      );
    } finally {
      if (currentLoadingTimestampFieldsIdx === this.currentLoadingTimestampFields) {
        this.timestampFieldOptions$.next(timestampOptions);
        this.loadingTimestampFields$.next(false);
      }
    }
  };
}
