/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { fromEventPattern, of, fromEvent } from 'rxjs';
import { concatMap, delay, map, takeUntil } from 'rxjs/operators';
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
} from './transforms';
import { resolve } from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';

const KIBANA_ROOT_PATH = '../../../..';
const KIBANA_ROOT = resolve(__dirname, KIBANA_ROOT_PATH);

const ms = process.env.DELAY || 0;
const staticSiteUrlBase = process.env.STATIC_SITE_URL_BASE || 'https://kibana-coverage.elastic.dev';
const addPrePopulatedTimeStamp = addTimeStamp(process.env.TIME_STAMP);
const prokStatsTimeStampBuildId = pipe(statsAndstaticSiteUrl, buildId, addPrePopulatedTimeStamp);
const addTestRunnerAndStaticSiteUrl = pipe(testRunner, staticSite(staticSiteUrlBase));

const execute = jsonSummaryPath => log => vcsInfo => {
  const objStream = jsonStream(jsonSummaryPath).on('done', noop);
  const itemizeVcsInfo = itemizeVcs(vcsInfo);

  fromEventPattern(_ => objStream.on('node', '!.*', _))
    .pipe(
      map(prokStatsTimeStampBuildId),
      map(coveredFilePath),
      map(itemizeVcsInfo),
      map(ciRunUrl),
      map(addJsonSummaryPath(jsonSummaryPath)),
      map(addTestRunnerAndStaticSiteUrl),
      concatMap(x => of(x).pipe(delay(ms)))
    )
    .subscribe(ingest(log));
};

export default ({ jsonSummaryPath, vcsInfoFilePath }, log) => {
  log.debug(`### Code coverage ingestion set to delay for: ${green(ms)} ms`);
  log.debug(`### KIBANA_ROOT: \n\t${green(KIBANA_ROOT)}`);
  log.debug(`### Ingesting from summary json: \n\t[${green(jsonSummaryPath)}]`);

  validateRoot(KIBANA_ROOT, log);

  const vcsInfo = [];
  const vcsInfoLines$ = vcsInfoFilePath => {
    const rl = readline.createInterface({ input: createReadStream(vcsInfoFilePath) });
    return fromEvent(rl, 'line').pipe(takeUntil(fromEvent(rl, 'close')));
  };

  const executeWithPath = execute(jsonSummaryPath)(log);
  const mutate = x => vcsInfo.push(x.trimStart().trimEnd());

  vcsInfoLines$(vcsInfoFilePath).subscribe(
    mutate,
    err => console.log('Error: %s', err),
    always(executeWithPath(vcsInfo))
  );
};

function validateRoot(x, log) {
  return /kibana$/.test(x) ? noop() : log.warning(`!!! 'kibana' NOT FOUND in ROOT: ${x}\n`);
}
