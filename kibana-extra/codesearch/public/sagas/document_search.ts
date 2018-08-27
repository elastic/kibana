/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { call, put, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';

import { Action } from 'redux-actions';
import {
  documentSearch,
  documentSearchFailed,
  DocumentSearchPayload,
  documentSearchSuccess,
} from '../actions';

function requestDocumentSearch(payload: DocumentSearchPayload) {
  const { query, page } = payload;
  if (query && query.length > 0) {
    return kfetch({
      pathname: `../api/cs/search/doc`,
      method: 'get',
      query: {
        q: query,
        p: page !== undefined ? page : 1,
      },
    });
  } else {
    return {
      documents: [],
      took: 0,
      total: 0,
    };
  }
}

function* handleDocumentSearch(action: Action<DocumentSearchPayload>) {
  try {
    const data = yield call(requestDocumentSearch, action.payload!);
    yield put(documentSearchSuccess(data));
  } catch (err) {
    yield put(documentSearchFailed(err));
  }
}

export function* watchDocumentSearch() {
  yield takeLatest(String(documentSearch), handleDocumentSearch);
}
