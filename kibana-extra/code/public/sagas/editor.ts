/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import queryString from 'query-string';
import { Action } from 'redux-actions';
import { call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { Location, TextDocumentPositionParams } from 'vscode-languageserver';
import { LspRestClient, TextDocumentMethods } from '../../common/lsp_client';
import { parseGoto, parseLspUrl, toCanonicalUrl } from '../../common/uri_util';
import { FileTree } from '../../model';
import {
  closeReferences,
  fetchFile,
  FetchFilePayload,
  fetchRepoTree,
  findReferences,
  findReferencesFailed,
  findReferencesSuccess,
  loadStructure,
  Match,
  resetRepoTree,
  revealPosition,
} from '../actions';
import { loadRepo, loadRepoFailed, loadRepoSuccess } from '../actions/status';
import * as ROUTES from '../components/routes';
import { fileSelector, getTree, lastRequestPathSelector, refUrlSelector } from '../selectors';
import { history } from '../utils/url';
import { requestFile } from './file';
import { mainRoutePattern } from './patterns';

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

function* handleReference(url: string) {
  const refUrl = yield select(refUrlSelector);
  if (refUrl === url) {
    return;
  }
  const { uri, position, schema, repoUri, file, revision } = parseLspUrl(url);
  if (uri && position) {
    yield put(
      findReferences({
        textDocument: {
          uri: toCanonicalUrl({ revision, schema, repoUri, file }),
        },
        position,
      })
    );
  }
}

function* handleFile(repoUri: string, file: string, revision: string) {
  const payload: FetchFilePayload = yield select(fileSelector);
  if (
    payload &&
    payload.path === file &&
    payload.revision === revision &&
    payload.uri === repoUri
  ) {
    return;
  }
  yield put(
    fetchFile({
      uri: repoUri,
      path: file,
      revision,
    })
  );
}

function fetchRepo(repoUri) {
  return kfetch({ pathname: `../api/cs/repo/${repoUri}` });
}

function* loadRepoSaga(action) {
  try {
    const repo = yield call(fetchRepo, action.payload);
    yield put(loadRepoSuccess(repo));
  } catch (e) {
    yield put(loadRepoFailed(e));
  }
}

export function* watchLoadRepo() {
  yield takeEvery(String(loadRepo), loadRepoSaga);
}

function* handleMainRouteChange(action: Action<Match>) {
  const { location } = action.payload!;
  const queryParams = queryString.parse(location.search);
  const { resource, org, repo, path: file, pathType, revision, goto } = action.payload!.params;
  const repoUri = `${resource}/${org}/${repo}`;
  let position;
  if (goto) {
    position = parseGoto(goto);
  }
  yield put(loadRepo(repoUri));
  if (file && pathType === ROUTES.PathTypes.blob) {
    yield call(handleFile, repoUri, file, revision);
    if (position) {
      yield put(revealPosition(position));
    }
    const { tab, refUrl } = queryParams;
    if (tab === 'references' && refUrl) {
      yield call(handleReference, decodeURIComponent(refUrl));
    }
  }
  const lastRequestPath = yield select(lastRequestPathSelector);
  const currentTree: FileTree = yield select(getTree);
  // repo changed
  if (currentTree.repoUri !== repoUri) {
    yield put(resetRepoTree());
  }
  yield put(
    fetchRepoTree({
      uri: repoUri,
      revision,
      path: file || '',
    })
  );
  if (file && pathType === ROUTES.PathTypes.blob) {
    const uri = toCanonicalUrl({
      repoUri,
      file,
      revision,
    });
    if (lastRequestPath !== uri) {
      yield put(loadStructure(uri!));
    }
  }
}

export function* watchMainRouteChange() {
  yield takeLatest(mainRoutePattern, handleMainRouteChange);
}
