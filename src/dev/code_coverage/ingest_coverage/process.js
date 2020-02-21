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

import { fromEventPattern, of } from 'rxjs';
import { concatMap, delay, map } from 'rxjs/operators';
import jsonStream from './json_stream';
import { pipe, noop, green } from './utils';
import { ingest } from './ingest';
import * as fs from 'fs';
import {
  staticSite,
  statsAndCoveredFilePath,
  addPath,
  testRunner,
  addTimeStamp,
  distro,
  buildId,
  maybeDropCoveredFilePath,
} from './transforms';
import moment from 'moment';
import { resolve } from "path";

const KIBANA_ROOT_PATH = '../../../..';
const KIBANA_ROOT = resolve(__dirname, KIBANA_ROOT_PATH);

const ms = process.env.DELAY || 0;
const staticSiteUrlBase = process.env.STATIC_SITE_URL_BASE || '';

const ts = log => {
  const timestamp = process.env.TIME_STAMP || moment.utc().format();
  const outFileDir = 'src/dev/code_coverage';
  const timeStampDatFileName = 'current_build_timestamp.dat';
  const fullTimeStampPath = resolve(KIBANA_ROOT, outFileDir, timeStampDatFileName);

  // log.debug(`\n### Flushing timestamp ${green(timestamp)}, to ${green(fullTimeStampPath)}`);
  //
  // flushTimeStamp(fullTimeStampPath)(timestamp);

  return timestamp;
};

const flushTimeStamp = filePath => x =>
  fs.writeFileSync(resolve(filePath), x, { encoding: 'utf8' });


export default ({ coveragePath }, log) => {
  log.debug(`### Code coverage ingestion set to delay for: ${green(ms)} ms`);
  log.debug(`### KIBANA_ROOT: \n\t${green(KIBANA_ROOT)}`);
  validateRoot(KIBANA_ROOT, log);
  const addPrePopulatedTimeStamp = addTimeStamp(ts(log));

  const prokStatsTimeStampBuildIdCoveredFilePath = pipe(
    statsAndCoveredFilePath,
    buildId,
    addPrePopulatedTimeStamp,
    staticSite(staticSiteUrlBase)
  );
  const addPathTestRunnerAndDistro = pipe(addPath(coveragePath), testRunner, distro);

  const objStream = jsonStream(coveragePath).on('done', noop);

  fromEventPattern(_ => objStream.on('node', '!.*', _))
    .pipe(
      map(prokStatsTimeStampBuildIdCoveredFilePath),
      map(addPathTestRunnerAndDistro),
      map(maybeDropCoveredFilePath),
      concatMap(x => of(x).pipe(delay(ms)))
    )
    .subscribe(ingest(log));
};

function validateRoot(x, log) {
  return /kibana$/.test(x) ? noop() : log.warning(`!!! 'kibana' NOT FOUND in ROOT: ${x}\n`);
}
