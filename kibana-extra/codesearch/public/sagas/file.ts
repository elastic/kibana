/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { call, put, select, takeEvery } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';
import { FileTree } from '../../model';
import {
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
  openTreePath,
} from '../actions';
import { getTree } from '../selectors';

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
  update.children.sort((a, b) => {
    const typeDiff = a.type - b.type;
    if (typeDiff === 0) {
      return a.name > b.name ? 1 : -1;
    } else {
      return -typeDiff;
    }
  });
  yield put(fetchRepoTreeSuccess(update));
  return update;
}

function requestRepoTree({ uri, revision, path, depth = 1 }: FetchRepoTreePayload) {
  return kfetch({
    pathname: `../api/cs/repo/${uri}/tree/${revision}/${path}`,
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
    pathname: `../api/cs/repo/${uri}/references`,
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
    pathname: `../api/cs/repo/${uri}/history/${revision}`,
  });
}

export function* watchFetchBranchesAndCommits() {
  yield takeEvery(String(fetchRepoBranches), handleFetchBranches);
  yield takeEvery(String(fetchRepoCommits), handleFetchCommits);
}
