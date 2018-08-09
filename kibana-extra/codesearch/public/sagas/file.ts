/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';
import { FileTree } from '../../model';
import {
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
          yield put(openTreePath(currentPath));
        } else {
          // path in missing in tree?
          break;
        }
      }
    }
    yield call(fetchPath, action.payload!);
  } catch (err) {
    yield put(fetchRepoTreeFailed(err));
  }
}

function* fetchPath(payload: FetchRepoTreePayload) {
  const update: FileTree = yield call(requestRepoTree, payload);
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
  yield takeLatest(String(fetchRepoTree), handleFetchRepoTree);
}
