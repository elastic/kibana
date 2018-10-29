/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { call, put, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';

import { Action } from 'redux-actions';
import { symbolSearchFailed, symbolSearchQueryChanged, symbolSearchSuccess } from '../actions';

function requestSymbolSearch(query: string) {
  if (query && query.length > 0) {
    return kfetch({
      pathname: `../api/code/search/symbol`,
      method: 'get',
      query: { q: query },
    });
  } else {
    return {
      symbols: [],
      took: 0,
      total: 0,
    };
  }
}

function* handleSymbolSearchQueryChanged(action: Action<string>) {
  try {
    const data = yield call(requestSymbolSearch, action.payload || '');
    yield put(symbolSearchSuccess(data));
  } catch (err) {
    yield put(symbolSearchFailed(err));
  }
}

export function* watchSymbolSearchQueryChanged() {
  yield takeLatest(String(symbolSearchQueryChanged), handleSymbolSearchQueryChanged);
}
