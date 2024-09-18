/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  checkHitCount,
  sendCompleteMsg,
  sendErrorMsg,
  sendErrorTo,
  sendLoadingMsg,
  sendLoadingMoreMsg,
  sendLoadingMoreFinishedMsg,
  sendNoResultsFoundMsg,
  sendPartialMsg,
} from './use_saved_search_messages';
import { FetchStatus } from '../../types';
import { BehaviorSubject } from 'rxjs';
import { DataDocumentsMsg, DataMainMsg } from '../state_management/discover_data_state_container';
import { filter } from 'rxjs';
import { dataViewMock, esHitsMockWithSort } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { searchResponseIncompleteWarningLocalCluster } from '@kbn/search-response-warnings/src/__mocks__/search_response_warnings';

describe('test useSavedSearch message generators', () => {
  test('sendCompleteMsg', (done) => {
    const main$ = new BehaviorSubject<DataMainMsg>({ fetchStatus: FetchStatus.LOADING });
    main$.subscribe((value) => {
      if (value.fetchStatus !== FetchStatus.LOADING) {
        expect(value.fetchStatus).toBe(FetchStatus.COMPLETE);
        expect(value.foundDocuments).toBe(true);
        expect(value.error).toBe(undefined);
        done();
      }
    });
    sendCompleteMsg(main$, true);
  });
  test('sendNoResultsFoundMsg', (done) => {
    const main$ = new BehaviorSubject<DataMainMsg>({ fetchStatus: FetchStatus.LOADING });
    main$
      .pipe(filter(({ fetchStatus }) => fetchStatus !== FetchStatus.LOADING))
      .subscribe((value) => {
        expect(value.fetchStatus).toBe(FetchStatus.COMPLETE);
        expect(value.foundDocuments).toBe(false);
        done();
      });
    sendNoResultsFoundMsg(main$);
  });
  test('sendPartialMessage', (done) => {
    const main$ = new BehaviorSubject<DataMainMsg>({ fetchStatus: FetchStatus.LOADING });
    main$.subscribe((value) => {
      if (value.fetchStatus !== FetchStatus.LOADING) {
        expect(value.fetchStatus).toBe(FetchStatus.PARTIAL);
        done();
      }
    });
    sendPartialMsg(main$);
  });
  test('sendLoadingMsg', (done) => {
    const main$ = new BehaviorSubject<DataMainMsg>({
      fetchStatus: FetchStatus.COMPLETE,
    });
    main$.subscribe((value) => {
      if (value.fetchStatus !== FetchStatus.COMPLETE) {
        expect(value.fetchStatus).toBe(FetchStatus.LOADING);
        done();
      }
    });
    sendLoadingMsg(main$, {
      foundDocuments: true,
    });
  });
  test('sendLoadingMoreMsg', (done) => {
    const documents$ = new BehaviorSubject<DataDocumentsMsg>({
      fetchStatus: FetchStatus.COMPLETE,
    });
    documents$.subscribe((value) => {
      if (value.fetchStatus !== FetchStatus.COMPLETE) {
        expect(value.fetchStatus).toBe(FetchStatus.LOADING_MORE);
        done();
      }
    });
    sendLoadingMoreMsg(documents$);
  });
  test('sendLoadingMoreFinishedMsg', (done) => {
    const records = esHitsMockWithSort.map((hit) => buildDataTableRecord(hit, dataViewMock));
    const initialRecords = [records[0], records[1]];
    const moreRecords = [records[2], records[3]];

    const documents$ = new BehaviorSubject<DataDocumentsMsg>({
      fetchStatus: FetchStatus.LOADING_MORE,
      result: initialRecords,
    });
    documents$.subscribe((value) => {
      if (value.fetchStatus !== FetchStatus.LOADING_MORE) {
        expect(value.fetchStatus).toBe(FetchStatus.COMPLETE);
        expect(value.result).toStrictEqual([...initialRecords, ...moreRecords]);
        expect(value.interceptedWarnings).toHaveLength(1);
        done();
      }
    });
    sendLoadingMoreFinishedMsg(documents$, {
      moreRecords,
      interceptedWarnings: [searchResponseIncompleteWarningLocalCluster],
    });
  });
  test('sendLoadingMoreFinishedMsg after an exception', (done) => {
    const records = esHitsMockWithSort.map((hit) => buildDataTableRecord(hit, dataViewMock));
    const initialRecords = [records[0], records[1]];

    const documents$ = new BehaviorSubject<DataDocumentsMsg>({
      fetchStatus: FetchStatus.LOADING_MORE,
      result: initialRecords,
      interceptedWarnings: [searchResponseIncompleteWarningLocalCluster],
    });
    documents$.subscribe((value) => {
      if (value.fetchStatus !== FetchStatus.LOADING_MORE) {
        expect(value.fetchStatus).toBe(FetchStatus.COMPLETE);
        expect(value.result).toBe(initialRecords);
        expect(value.interceptedWarnings).toBeUndefined();
        done();
      }
    });
    sendLoadingMoreFinishedMsg(documents$, {
      moreRecords: [],
      interceptedWarnings: undefined,
    });
  });
  test('sendErrorMsg', (done) => {
    const main$ = new BehaviorSubject<DataMainMsg>({ fetchStatus: FetchStatus.PARTIAL });
    main$.subscribe((value) => {
      if (value.fetchStatus === FetchStatus.ERROR) {
        expect(value.fetchStatus).toBe(FetchStatus.ERROR);
        expect(value.error).toBeInstanceOf(Error);
        done();
      }
    });
    sendErrorMsg(main$, new Error('Pls help!'));
  });

  test('sendCompleteMsg cleaning error state message', (done) => {
    const initialState = {
      fetchStatus: FetchStatus.ERROR,
      error: new Error('Oh noes!'),
    };
    const main$ = new BehaviorSubject<DataMainMsg>(initialState);
    main$.subscribe((value) => {
      if (value.fetchStatus === FetchStatus.COMPLETE) {
        const newState = { ...initialState, ...value };
        expect(newState.fetchStatus).toBe(FetchStatus.COMPLETE);
        expect(newState.error).toBeUndefined();
        done();
      }
    });
    sendCompleteMsg(main$, false);
  });

  test('sendErrorTo', (done) => {
    const main$ = new BehaviorSubject<DataMainMsg>({ fetchStatus: FetchStatus.PARTIAL });
    const error = new Error('Pls help!');
    main$.subscribe((value) => {
      expect(value.fetchStatus).toBe(FetchStatus.ERROR);
      expect(value.error).toBe(error);
      done();
    });
    sendErrorTo(main$)(error);
  });

  test('checkHitCount with hits', (done) => {
    const main$ = new BehaviorSubject<DataMainMsg>({ fetchStatus: FetchStatus.LOADING });
    main$.subscribe((value) => {
      expect(value.fetchStatus).toBe(FetchStatus.PARTIAL);
      done();
    });
    checkHitCount(main$, 100);
  });

  test('checkHitCount without hits', (done) => {
    const main$ = new BehaviorSubject<DataMainMsg>({ fetchStatus: FetchStatus.LOADING });
    main$.subscribe((value) => {
      expect(value.fetchStatus).toBe(FetchStatus.COMPLETE);
      expect(value.foundDocuments).toBe(false);
      done();
    });
    checkHitCount(main$, 0);
  });
});
