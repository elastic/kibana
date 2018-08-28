/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOCATION_CHANGE } from 'connected-react-router';
import queryString from 'query-string';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { parseLspUrl, toCanonicalUrl } from '../../common/uri_util';
import {
  documentSearch,
  fetchFile,
  FetchFilePayload,
  fetchRepos,
  findReferences,
  loadStructure,
  revealPosition,
} from '../actions';
import * as ROUTES from '../components/routes';
import { fileSelector, lastRequestPathSelector, refUrlSelector } from '../selectors';

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

function* handleLocationChange(action: any) {
  // TODO: we need to find a better solution to integrate routing data into
  // reducer.
  const { pathname, search } = action.payload.location;
  const queryParams = queryString.parse(search);

  if (ROUTES.adminRegex.test(pathname)) {
    yield put(fetchRepos());
  } else if (ROUTES.mainRegex.test(pathname)) {
    const { file, pathType, repoUri, revision, schema, position } = parseLspUrl(pathname);
    if (file && pathType === ROUTES.PathTypes.blob) {
      yield call(handleFile, repoUri, file, revision);
      if (position) {
        yield put(revealPosition(position));
      }
      const { tab, refUrl } = queryParams;
      if (tab === 'references' && refUrl) {
        yield call(handleReference, decodeURIComponent(refUrl));
      }
      const uri = toCanonicalUrl({ revision, schema, repoUri, file });
      const lastRequestPath = yield select(lastRequestPathSelector);
      if (lastRequestPath !== uri) {
        yield put(loadStructure(uri!));
      }
    }
  } else if (ROUTES.searchRegex.test(pathname)) {
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
  yield takeLatest(LOCATION_CHANGE, handleLocationChange);
}
