/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { call, put, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';

import { Action } from 'redux-actions';
import { searchFailed, searchQueryChanged, searchSuccess } from '../actions';

function requestSearch(query: string) {
  if (query && query.length > 0) {
    return kfetch({
      pathname: `../api/cs/search/symbol`,
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

function* handleSearchQueryChanged(action: Action<string>) {
  try {
    const data = yield call(requestSearch, action.payload || '');
    yield put(searchSuccess(data));
  } catch (err) {
    yield put(searchFailed(err));
  }
}

export function* watchSearchQueryChanged() {
  yield takeLatest(String(searchQueryChanged), handleSearchQueryChanged);
}
