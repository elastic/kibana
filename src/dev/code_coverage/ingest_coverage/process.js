/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromEventPattern, fromEvent, map, mergeMap, takeUntil, bufferCount } from 'rxjs';
import jsonStream from './json_stream';
import { pipe, noop } from './utils';
import { ingestList } from './ingest';
import {
  staticSite,
  statsAndstaticSiteUrl,
  addJsonSummaryPath,
  testRunner,
  addTimeStamp,
  buildId,
  coveredFilePath,
  ciRunUrl,
  itemizeVcs,
  teamAssignment,
} from './transforms';
import { resolve } from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import * as moment from 'moment';

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
