/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { entries } from 'lodash';
import queryString from 'query-string';
import { Action } from 'redux-actions';
import { call, put, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';
import { TextDocumentPositionParams } from 'vscode-languageserver';
import {
  closeReferences,
  findReferences,
  findReferencesFailed,
  findReferencesSuccess,
} from '../actions';
import { history } from '../utils/url';

function* handleReferences(action: Action<TextDocumentPositionParams>) {
  try {
    const params: TextDocumentPositionParams = action.payload!;
    const response = yield call(requestFindReferences, params);
    const results = entries(response).map((v: any) => ({ repo: v[0], files: v[1] }));
    yield put(findReferencesSuccess(results));
  } catch (error) {
    yield put(findReferencesFailed(error));
  }
}

function requestFindReferences(params: TextDocumentPositionParams) {
  return kfetch({
    pathname: `../api/lsp/findReferences`,
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function* watchLspMethods() {
  yield takeLatest(String(findReferences), handleReferences);
}

function handleCloseReferences() {
  const { pathname, search } = history.location;
  const queryParams = queryString.parse(search);
  if (queryParams.tab) {
    queryParams.tab = undefined;
  }
  if (queryParams.refUrl) {
    queryParams.refUrl = undefined;
  }
  const query = queryString.stringify(queryParams);
  if (query) {
    history.push(`${pathname}?${query}`);
  } else {
    history.push(pathname);
  }
}

export function* watchCloseReference() {
  yield takeLatest(String(closeReferences), handleCloseReferences);
}
