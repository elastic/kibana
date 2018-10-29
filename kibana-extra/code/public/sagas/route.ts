/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import queryString from 'query-string';
import { call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { parseGoto, parseLspUrl, toCanonicalUrl } from '../../common/uri_util';
import {
  documentSearch,
  fetchFile,
  FetchFilePayload,
  fetchRepoConfigs,
  fetchRepos,
  fetchRepoTree,
  findReferences,
  gotoRepo,
  loadStructure,
  loadUserConfig,
  Match,
  resetRepoTree,
  revealPosition,
  routeChange,
} from '../actions';

import { Action } from 'redux-actions';
import { kfetch } from 'ui/kfetch';
import { FileTree } from '../../model';
import { loadRepo, loadRepoFailed, loadRepoSuccess } from '../actions/status';
import * as ROUTES from '../components/routes';
import { fileSelector, getTree, lastRequestPathSelector, refUrlSelector } from '../selectors';

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
  return kfetch({ pathname: `../api/code/repo/${repoUri}` });
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

function* handleLocationChange(action: Action<Match>) {
  // TODO: we need to find a better solution to integrate routing data into
  // reducer.
  const { path, location, url } = action.payload!;
  const queryParams = queryString.parse(location.search);
  if (ROUTES.ADMIN === path) {
    yield put(fetchRepos());
    yield put(fetchRepoConfigs());
    yield put(loadUserConfig());
  } else if (ROUTES.REPO === path) {
    yield put(gotoRepo(url));
  } else if (ROUTES.MAIN === path || ROUTES.MAIN_ROOT === path) {
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
  } else if (ROUTES.SEARCH === path) {
    const { q, p, langs, repos } = queryParams;
    yield put(
      documentSearch({
        query: q,
        page: p,
        languages: langs,
        repositories: repos,
      })
    );
  }
}

export function* watchLocationChange() {
  yield takeLatest(String(routeChange), handleLocationChange);
}
