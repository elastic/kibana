/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { entries, groupBy } from 'lodash';
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
  GroupedFileReferences,
  GroupedRepoReferences,
  LineRange,
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
    const results = yield call(requestAllCodes, locations);
    yield put(findReferencesSuccess(results));
  } catch (error) {
    yield put(findReferencesFailed(error));
  }
}

function requestReferences(params: TextDocumentPositionParams) {
  return lspMethods.references.send(params);
}

async function requestAllCodes(allLocations: Location[]): Promise<GroupedRepoReferences[]> {
  const groupedByUri = groupBy(allLocations, 'uri');
  const repoFileMap: { [repo: string]: GroupedFileReferences[] } = {};
  for (const entry of entries(groupedByUri)) {
    const uri: string = entry[0];
    const { repoUri, revision, file } = parseLspUrl(uri)!;
    let files = repoFileMap[repoUri];
    if (!files) {
      repoFileMap[repoUri] = files = [];
    }
    const rangeAndLocations = mergeRanges(entry[1]);
    const groupedFile: GroupedFileReferences = {
      language: undefined,
      codes: [],
      path: file!,
    };
    for (const { lineRange, locations } of rangeAndLocations) {
      const { content: code, lang } = await requestCode(lineRange, repoUri, revision, file!);
      groupedFile.language = lang;
      const codeAndLocation = {
        code,
        lineRange,
        locations,
      } as CodeAndLocation;
      groupedFile.codes.push(codeAndLocation);
    }
    files.push(groupedFile);
  }
  return entries(repoFileMap).map((entry: any) => ({
    repo: entry[0],
    files: entry[1],
  }));
}

interface RangeAndLocations {
  lineRange: LineRange;
  locations: Location[];
}

function mergeRanges(locations: Location[]): RangeAndLocations[] {
  const sortedLocations = locations.sort((a, b) => a.range.start.line - b.range.start.line);
  const results: RangeAndLocations[] = [];

  const mergeIfOverlap = (a: LineRange, b: LineRange) => {
    // a <= b is always true here because sorting above
    if (b.startLine >= a.startLine && b.startLine <= a.endLine) {
      // overlap
      if (b.endLine > a.endLine) {
        a.endLine = b.endLine; // extend previous range
      }
      return true;
    }
    return false;
  };

  for (const location of sortedLocations) {
    const startLine = Math.max(location.range.start.line - 3, 0);
    const endLine = location.range.end.line + 3;
    const lineRange = { startLine, endLine };
    if (results.length > 0) {
      const last = results[results.length - 1];
      if (mergeIfOverlap(last.lineRange, lineRange)) {
        last.locations.push(location);
        continue;
      }
    }
    results.push({
      lineRange,
      locations: [location],
    });
  }
  return results;
}

function requestCode(
  { startLine, endLine }: LineRange,
  repoUri: string,
  revision: string,
  file: string
) {
  const line = `${startLine},${endLine}`;
  return requestFile(
    {
      revision,
      path: file!,
      uri: repoUri,
    },
    line
  );
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
