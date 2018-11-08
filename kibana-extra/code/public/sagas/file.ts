/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';
import { FileTree } from '../../model';
import {
  fetchDirectory,
  fetchDirectoryFailed,
  fetchDirectorySuccess,
  fetchFile,
  fetchFileFailed,
  FetchFilePayload,
  FetchFileResponse,
  fetchFileSuccess,
  fetchRepoBranches,
  fetchRepoBranchesFailed,
  fetchRepoBranchesSuccess,
  fetchRepoCommits,
  fetchRepoCommitsFailed,
  fetchRepoCommitsSuccess,
  FetchRepoPayload,
  FetchRepoPayloadWithRevision,
  fetchRepoTree,
  fetchRepoTreeFailed,
  FetchRepoTreePayload,
  fetchRepoTreeSuccess,
  gotoRepo,
  Match,
  openTreePath,
  setNotFound,
} from '../actions';
import { getTree } from '../selectors';
import { repoRoutePattern } from './patterns';

function* handleFetchRepoTree(action: Action<FetchRepoTreePayload>) {
  try {
    let currentTree: FileTree = yield select(getTree);
    const { uri, revision, path } = action.payload!;
    if (path) {
      const pathSegments = path.split('/');
      let currentPath = '';
      // open all directories on the path
      for (const p of pathSegments) {
        if (!currentTree.children) {
          currentTree = yield call(fetchPath, { uri, revision, path: currentPath });
        }
        const child = currentTree.children!.find(c => c.name === p);
        if (child) {
          currentTree = child;
          currentPath = currentPath ? `${currentPath}/${p}` : p;
          if (!currentTree.children) {
            yield call(fetchPath, { uri, revision, path: currentPath });
          }
          yield put(openTreePath(currentPath));
        } else {
          // path in missing in tree?
          break;
        }
      }
    } else {
      yield call(fetchPath, action.payload!);
    }
  } catch (err) {
    yield put(fetchRepoTreeFailed(err));
  }
}

function* fetchPath(payload: FetchRepoTreePayload) {
  const update: FileTree = yield call(requestRepoTree, payload);
  (update.children || []).sort((a, b) => {
    const typeDiff = a.type - b.type;
    if (typeDiff === 0) {
      return a.name > b.name ? 1 : -1;
    } else {
      return -typeDiff;
    }
  });
  update.repoUri = payload.uri;
  yield put(fetchRepoTreeSuccess(update));
  return update;
}

function requestRepoTree({ uri, revision, path, depth = 1 }: FetchRepoTreePayload) {
  return kfetch({
    pathname: `../api/code/repo/${uri}/tree/${revision}/${path}`,
    query: { depth },
  });
}

export function* watchFetchRepoTree() {
  yield takeEvery(String(fetchRepoTree), handleFetchRepoTree);
}

function* handleFetchBranches(action: Action<FetchRepoPayload>) {
  try {
    const results = yield call(requestBranches, action.payload!);
    yield put(fetchRepoBranchesSuccess(results));
  } catch (err) {
    yield put(fetchRepoBranchesFailed(err));
  }
}

function requestBranches({ uri }: FetchRepoPayload) {
  return kfetch({
    pathname: `../api/code/repo/${uri}/references`,
  });
}

function* handleFetchCommits(action: Action<FetchRepoPayloadWithRevision>) {
  try {
    const results = yield call(requestCommits, action.payload!);
    yield put(fetchRepoCommitsSuccess(results));
  } catch (err) {
    yield put(fetchRepoCommitsFailed(err));
  }
}

function requestCommits({ uri, revision }: FetchRepoPayloadWithRevision) {
  return kfetch({
    pathname: `../api/code/repo/${uri}/history/${revision}`,
  });
}

export async function requestFile(
  payload: FetchFilePayload,
  line?: string
): Promise<FetchFileResponse> {
  const { uri, revision, path } = payload;
  let url = `../api/code/repo/${uri}/blob/${revision}/${path}`;
  if (line) {
    url += '?line=' + line;
  }
  const response: Response = await fetch(url);
  if (response.status === 200) {
    const contentType = response.headers.get('Content-Type');

    if (contentType && contentType.startsWith('text/')) {
      const lang = contentType.split(';')[0].substring('text/'.length);
      return {
        payload,
        lang,
        content: await response.text(),
      };
    } else if (contentType && contentType.startsWith('image/')) {
      return {
        payload,
        isImage: true,
        content: await response.text(),
        url,
      };
    }
  } else if (response.status === 404) {
    return {
      payload,
      isNotFound: true,
    };
  }
  throw new Error('invalid file type');
}

function* handleFetchFile(action: Action<FetchFilePayload>) {
  try {
    const results = yield call(requestFile, action.payload!);
    if (results.isNotFound) {
      yield put(setNotFound(true));
      yield put(fetchFileFailed(new Error('file not found')));
    } else {
      yield put(fetchFileSuccess(results));
    }
  } catch (err) {
    yield put(fetchFileFailed(err));
  }
}

function* handleFetchDirs(action: Action<FetchRepoTreePayload>) {
  try {
    const dir = yield call(requestRepoTree, action.payload);
    yield put(fetchDirectorySuccess(dir));
  } catch (err) {
    yield fetchDirectoryFailed(err);
  }
}

export function* watchFetchBranchesAndCommits() {
  yield takeEvery(String(fetchRepoBranches), handleFetchBranches);
  yield takeEvery(String(fetchRepoCommits), handleFetchCommits);
  yield takeLatest(String(fetchFile), handleFetchFile);
  yield takeEvery(String(fetchDirectory), handleFetchDirs);
}

function* handleRepoRouteChange(action: Action<Match>) {
  const { url } = action.payload!;
  yield put(gotoRepo(url));
}

export function* watchRepoRouteChange() {
  yield takeEvery(repoRoutePattern, handleRepoRouteChange);
}
