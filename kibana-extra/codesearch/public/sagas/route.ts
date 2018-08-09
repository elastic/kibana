/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LOCATION_CHANGE } from 'connected-react-router';
import { put, select, takeLatest } from 'redux-saga/effects';
import { fetchRepos, loadStructure } from '../actions';
import * as ROUTES from '../components/routes';
import { lastRequestPathSelector } from '../selectors';

function* handleLocationChange(action: any) {
  const { pathname } = action.payload.location;
  if (ROUTES.adminRegex.test(pathname)) {
    yield put(fetchRepos());
  } else if (ROUTES.mainRegex.test(pathname)) {
    const lastRequestPath = yield select(lastRequestPathSelector);
    const [resource, org, repo, , revision, path] = ROUTES.mainRegex.exec(pathname)!.slice(1);
    if (path) {
      const uri = `${resource}/${org}/${repo}?${revision}#${path}`;
      if (lastRequestPath !== uri) {
        yield put(loadStructure(uri));
      }
    }
  }
}

export function* watchLocationChange() {
  yield takeLatest(LOCATION_CHANGE, handleLocationChange);
}
