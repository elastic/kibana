/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { fromEventPattern, of, fromEvent } from 'rxjs';
import { concatMap, delay, map, mergeMap, takeUntil } from 'rxjs/operators';
import jsonStream from './json_stream';
import { pipe, noop, green, always } from './utils';
import { ingest } from './ingest';
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
const ms = process.env.DELAY || 0;
const staticSiteUrlBase = process.env.STATIC_SITE_URL_BASE || 'https://kibana-coverage.elastic.dev';
const format = 'YYYY-MM-DDTHH:mm:SS';
// eslint-disable-next-line import/namespace
const formatted = `${moment.utc().format(format)}Z`;
const addPrePopulatedTimeStamp = addTimeStamp(process.env.TIME_STAMP || formatted);
const preamble = pipe(statsAndstaticSiteUrl, rootDirAndOrigPath, buildId, addPrePopulatedTimeStamp);
const addTestRunnerAndStaticSiteUrl = pipe(testRunner, staticSite(staticSiteUrlBase));

const transform = (jsonSummaryPath) => (log) => (vcsInfo) => (teamAssignmentsPath) => {
  const objStream = jsonStream(jsonSummaryPath).on('done', noop);
  const itemizeVcsInfo = itemizeVcs(vcsInfo);
  const assignTeams = teamAssignment(teamAssignmentsPath)(log);

  const jsonSummary$ = (_) => objStream.on('node', '!.*', _);

  fromEventPattern(jsonSummary$)
    .pipe(
      map(preamble),
      map(coveredFilePath),
      map(itemizeVcsInfo),
      map(ciRunUrl),
      map(addJsonSummaryPath(jsonSummaryPath)),
      map(addTestRunnerAndStaticSiteUrl),
      mergeMap(assignTeams),
      concatMap((x) => of(x).pipe(delay(ms)))
    )
    .subscribe(ingest(log));
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
  logAll(jsonSummaryPath, log);

  const xformWithPath = transform(jsonSummaryPath)(log); // On complete

  const vcsInfo = [];
  vcsInfoLines$(vcsInfoFilePath).subscribe(
    mutateVcsInfo(vcsInfo),
    (err) => log.error(err),
    always(xformWithPath(vcsInfo)(teamAssignmentsPath))
  );
};

function logAll(jsonSummaryPath, log) {
  log.debug(`### Code coverage ingestion set to delay for: ${green(ms)} ms`);
  log.debug(`### COVERAGE_INGESTION_KIBANA_ROOT: \n\t${green(COVERAGE_INGESTION_KIBANA_ROOT)}`);
  log.debug(`### Ingesting from summary json: \n\t[${green(jsonSummaryPath)}]`);
}

function validateRoot(x, log) {
  return /kibana$/.test(x) ? noop() : log.warning(`✖✖✖ 'kibana' NOT FOUND in ROOT: ${x}\n`);
}
