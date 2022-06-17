/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  sendCompleteMsg,
  sendErrorMsg,
  sendLoadingMsg,
  sendNoResultsFoundMsg,
  sendPartialMsg,
} from './use_saved_search_messages';
import { FetchStatus } from '../../types';
import { BehaviorSubject } from 'rxjs';
import { DataMainMsg } from './use_saved_search';
import { filter } from 'rxjs/operators';

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
    const main$ = new BehaviorSubject<DataMainMsg>({ fetchStatus: FetchStatus.COMPLETE });
    main$.subscribe((value) => {
      if (value.fetchStatus !== FetchStatus.COMPLETE) {
        expect(value.fetchStatus).toBe(FetchStatus.LOADING);
        done();
      }
    });
    sendLoadingMsg(main$);
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
});
