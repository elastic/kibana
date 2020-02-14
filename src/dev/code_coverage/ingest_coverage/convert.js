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

import { fromEventPattern } from 'rxjs';
import { map } from 'rxjs/operators';
// import { tap } from 'rxjs/operators';
import jsonStream from './json_stream';
import { pipe } from './utils';
import {
  staticSite,
  statsAndCoveredFilePath,
  addPath,
  testRunner,
  // truncate,
  timeStamp,
  distro,
  buildId,
  maybeDropCoveredFilePath } from './conversions';

// const dropKibana = truncate('kibana');

export default ({ coveragePath }, log) => {
  const objStream = jsonStream(coveragePath).on('done', _ =>
    log.debug(`### Done streaming from \n\t${coveragePath}`),
  );

  const staticSiteUrlBase = process.env.STATIC_SITE_URL_BASE || '';
  const staticSiteUrl = staticSite(staticSiteUrlBase);
  const prokStatsAndCoveredFilePath = pipe(statsAndCoveredFilePath, buildId, staticSiteUrl);
  const addTestRunnerAndTimeStampAndDistro = pipe(testRunner, timeStamp, distro);

  return fromEventPattern(_ => objStream.on('node', '!.*', _)).pipe(
    map(prokStatsAndCoveredFilePath),
    map(addPath(coveragePath)),
    map(addTestRunnerAndTimeStampAndDistro),
    map(maybeDropCoveredFilePath),
  );
};

