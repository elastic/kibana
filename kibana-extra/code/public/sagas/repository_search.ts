/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { call, put, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';

import { Action } from 'redux-actions';
import {
  repositorySearch,
  repositorySearchFailed,
  RepositorySearchPayload,
  repositorySearchQueryChanged,
  repositorySearchSuccess,
} from '../actions/search';

function requestRepositorySearch(q: string) {
  return kfetch({
    pathname: `../api/code/search/repo`,
    method: 'get',
    query: { q },
  });
}

function* handleRepositorySearch(action: Action<RepositorySearchPayload>) {
  try {
    const data = yield call(requestRepositorySearch, action.payload!.query);
    yield put(repositorySearchSuccess(data));
  } catch (err) {
    yield put(repositorySearchFailed(err));
  }
}

export function* watchRepositorySearch() {
  yield takeLatest(
    [String(repositorySearch), String(repositorySearchQueryChanged)],
    handleRepositorySearch
  );
}
