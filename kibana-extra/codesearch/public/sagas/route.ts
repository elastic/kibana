/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOCATION_CHANGE } from 'connected-react-router';
import _ from 'lodash';
import { put, select, takeLatest } from 'redux-saga/effects';

import { toCanonicalUrl } from '../../common/uri_util';
import { fetchRepos, fullSearch, loadStructure } from '../actions';
import * as ROUTES from '../components/routes';
import { lastRequestPathSelector } from '../selectors';

function* handleLocationChange(action: any) {
  // TODO: we need to find a better solution to integrate routing data into
  // reducer.
  const { pathname, search } = action.payload.location;
  if (ROUTES.adminRegex.test(pathname)) {
    yield put(fetchRepos());
  } else if (ROUTES.mainRegex.test(pathname)) {
    const lastRequestPath = yield select(lastRequestPathSelector);
    const [resource, org, repo, pathType, revision, path] = ROUTES.mainRegex
      .exec(pathname)!
      .slice(1);
    if (path && pathType === ROUTES.PathTypes.blob) {
      const uri = toCanonicalUrl({
        repoUri: `${resource}/${org}/${repo}`,
        file: path,
        revision,
      });
      if (lastRequestPath !== uri) {
        yield put(loadStructure(uri));
      }
    }
  } else if (ROUTES.searchRegex.test(pathname)) {
    const queryParams = _.chain(search)
      .replace('?', '')
      .split('&')
      .map(_.partial(_.split, _, '=', 2))
      .fromPairs()
      .value();
    const { q } = queryParams;
    yield put(fullSearch(q));
  }
}

export function* watchLocationChange() {
  yield takeLatest(LOCATION_CHANGE, handleLocationChange);
}
