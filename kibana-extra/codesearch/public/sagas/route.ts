/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOCATION_CHANGE } from 'connected-react-router';
import { put, takeLatest } from 'redux-saga/effects';
import { fetchRepos } from '../actions';

function* handleLocationChange(action: any) {
  if (action.payload) {
    let pathname: string;
    if (action.payload.location) {
      pathname = action.payload.location.pathname;
    } else {
      pathname = action.payload.pathname;
    }
    if (pathname && pathname.startsWith('/admin')) {
      yield put(fetchRepos());
    }
  }
}

export function* watchLocationChange() {
  yield takeLatest(LOCATION_CHANGE, handleLocationChange);
}
