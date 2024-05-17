/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createReadStream } from 'fs';
import { resolve } from 'path';
import readline from 'readline';
import * as moment from 'moment';
import { bufferCount, fromEvent, fromEventPattern, map, mergeMap, takeUntil } from 'rxjs';
import { ingestList } from './ingest';
import jsonStream from './json_stream';
import {
  addJsonSummaryPath,
  addTimeStamp,
  buildId,
  ciRunUrl,
  coveredFilePath,
  itemizeVcs,
  staticSite,
  statsAndstaticSiteUrl,
  teamAssignment,
  testRunner,
} from './transforms';
import { noop, pipe } from './utils';

const ROOT = '../../../..';
const COVERAGE_INGESTION_KIBANA_ROOT =
  process.env.COVERAGE_INGESTION_KIBANA_ROOT || resolve(__dirname, ROOT);
const BUFFER_SIZE = process.env.BUFFER_SIZE || 100;
const staticSiteUrlBase = process.env.STATIC_SITE_URL_BASE || 'https://kibana-coverage.elastic.dev';
const format = 'YYYY-MM-DDTHH:mm:SS';
// eslint-disable-next-line import/namespace
const formatted = `${moment.utc().format(format)}Z`;
const addPrePopulatedTimeStamp = addTimeStamp(process.env.TIME_STAMP || formatted);

const transform = (jsonSummaryPath) => (log) => (vcsInfo) => (teamAssignmentsPath) => {
  const objStream = jsonStream(jsonSummaryPath).on('done', noop);
  const itemizeVcsInfo = itemizeVcs(vcsInfo);
  const assignTeams = teamAssignment(teamAssignmentsPath)(log);

  const jsonSummary$ = (_) => objStream.on('node', '!.*', _);

  fromEventPattern(jsonSummary$)
    .pipe(
      map(
        pipe(
          statsAndstaticSiteUrl,
          rootDirAndOrigPath,
          buildId,
          addPrePopulatedTimeStamp,
          coveredFilePath,
          itemizeVcsInfo,
          ciRunUrl,
          addJsonSummaryPath(jsonSummaryPath),
          testRunner,
          staticSite(staticSiteUrlBase)
        )
      ),
      mergeMap(assignTeams),
      bufferCount(BUFFER_SIZE)
    )
    .subscribe(ingestList(log));
};

function rootDirAndOrigPath(obj) {
  return {
    ...obj,
    originalFilePath: obj.staticSiteUrl,
    COVERAGE_INGESTION_KIBANA_ROOT,
  };
}

const mutateVcsInfo = (vcsInfo) => (x) => vcsInfo.push(x.trimStart().trimEnd());
const vcsInfoLines$ = (vcsInfoFilePath) => {
  const rl = readline.createInterface({ input: createReadStream(vcsInfoFilePath) });
  return fromEvent(rl, 'line').pipe(takeUntil(fromEvent(rl, 'close')));
};

export const prok = ({ jsonSummaryPath, vcsInfoFilePath, teamAssignmentsPath }, log) => {
  validateRoot(COVERAGE_INGESTION_KIBANA_ROOT, log);

  const xformWithPath = transform(jsonSummaryPath)(log); // On complete

  const vcsInfo = [];

  vcsInfoLines$(vcsInfoFilePath).subscribe(
    mutateVcsInfo(vcsInfo),
    (err) => log.error(err),
    () => xformWithPath(vcsInfo)(teamAssignmentsPath)
  );
};

function validateRoot(x, log) {
  return /kibana$/.test(x) ? noop() : log.warning(`✖✖✖ 'kibana' NOT FOUND in ROOT: ${x}\n`);
}
