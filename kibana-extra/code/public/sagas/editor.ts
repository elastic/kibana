/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import queryString from 'query-string';
import { Action } from 'redux-actions';
import { call, put, takeLatest } from 'redux-saga/effects';
import { Location, TextDocumentPositionParams } from 'vscode-languageserver';
import { LspRestClient, TextDocumentMethods } from '../../common/lsp_client';
import { parseLspUrl } from '../../common/uri_util';
import {
  closeReferences,
  CodeAndLocation,
  findReferences,
  findReferencesFailed,
  findReferencesSuccess,
} from '../actions';
import { history } from '../utils/url';
import { requestFile } from './file';

const lspClient = new LspRestClient('../api/lsp');
const lspMethods = new TextDocumentMethods(lspClient);

function* handleReferences(action: Action<TextDocumentPositionParams>) {
  try {
    const locations: Location[] = yield call(
      requestReferences,
      action.payload as TextDocumentPositionParams
    );
    const locationWithCodes = yield call(requestAllCodes, locations);
    yield put(findReferencesSuccess(locationWithCodes));
  } catch (error) {
    yield put(findReferencesFailed(error));
  }
}

function requestReferences(params: TextDocumentPositionParams) {
  return lspMethods.references.send(params);
}

function requestAllCodes(locations: Location[]) {
  const promises = locations.map(location => {
    return requestCode(location);
  });
  return Promise.all(promises);
}

function requestCode(location: Location): Promise<CodeAndLocation> {
  const { repoUri, revision, file } = parseLspUrl(location.uri)!;
  const startLine = Math.max(location.range.start.line - 2, 0);
  const endLine = location.range.end.line + 3;
  const line = `${startLine},${endLine}`;
  return requestFile(
    {
      revision,
      path: file!,
      uri: repoUri,
    },
    line
  ).then(response => ({
    location,
    repo: repoUri,
    path: file!,
    code: response.content!,
    language: response.lang,
    startLine,
    endLine,
  }));
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
