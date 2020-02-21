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

import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as readline from 'readline';
import * as fs from 'fs';
import { resolve } from 'path';
import { pipe, pretty } from './utils';
import * as rawData from '../../cc_app/public/initial_data_raw.js';

export const parseAndPopulate = buildNumber => srcFile => destFile => log => {
  const logV = verbose(log);
  logV({ 'buildNumber': buildNumber, 'srcFile': srcFile, 'destFile': destFile });
  const [resolvedSrcFile, resolvedDestFile] = resolvePaths(srcFile, destFile);
  logV({ 'resolvedSrcFile': resolvedSrcFile, 'resolvedDestFile': resolvedDestFile });

  const initialData = dedupe(rawData);

  const historicalItems = [];
  const mutateHistorical = onLineRead(historicalItems);
  const onErr = x => log.error(`!!! ${x}`);
  const mutateInitial = onComplete(initialData);

  const rl = readline.createInterface({ input: fs.createReadStream(resolvedSrcFile) });

  fromEvent(rl, 'line')
    .pipe(takeUntil(fromEvent(rl, 'close')))
    .subscribe(mutateHistorical, onErr, () => mutateInitial(historicalItems, log, resolvedDestFile, buildNumber));

};

function onComplete (initData) {
  const prettyFlush = pipe(pretty, flush);
  return function mutateInitialData (xs, log, destFile, currentJobNumber) {
    initData.historicalItems = normalize(xs);
    initData.currentJobNumber = currentJobNumber;

    const constructCurrentFrom = currentItem(currentJobNumber, log);
    const prefix = 'gs://kibana-ci-artifacts/jobs/elastic+kibana+code-coverage/';

    initData.currentItem = `${constructCurrentFrom(prefix)}`;


    prettyFlush(initData)(destFile);
    log.debug('### Completed');
  };
}

function currentItem(currentBuildNumber, log) {
  const HARD_CODED_TS = '2020-01-28T23-15-17Z'
  if (process.env.TIME_STAMP)
    log.debug(`\n### Using TIME_STAMP from env: ${process.env.TIME_STAMP}`);
  else
    log.debug(`\n### Using HARDCODED TIME_STAMP: ${HARD_CODED_TS}`);

  const timeStamp = process.env.TIME_STAMP || HARD_CODED_TS;

  return prefix => `${prefix}${currentBuildNumber}/${timeStamp}/`;
}

function normalize(xs) {
  const dropEmpty = x => x !== '';
  const dropDuplicates = () => [...new Set(xs.filter(dropEmpty))];
  // const dontDropDuplicates = () => [...xs.filter(dropEmpty)];
  return dropDuplicates();
}

function flush (initData) {
  return function flushInner (destFile) {
    const fill = boilerplate(initData);
    console.log(`\n### fill: \n${fill}`);
    fs.writeFileSync(destFile, fill, { encoding: 'utf8' });
  };
}

function boilerplate (initData) {
  return `const initialData = ${initData};

if (!isInBrowser()) {
  module.exports.default = {}
  module.exports.default = initialData
} else {
  window.initialData = initialData;
}

function isInBrowser() {
  return !!(typeof window !== 'undefined');
}
`;
}

function onLineRead (xs) {
  return function pushOntoHistoricalItems (x) {
    xs.push(x);
  };
}

function dedupe (obj) {
  return obj.default.default;
}

function resolvePaths (...xs) {
  return xs.map(x => resolve(kibanaRoot(), x));
}

function kibanaRoot () {
  const KIBANA_ROOT_PATH = '../../../../..';
  return resolve(__dirname, KIBANA_ROOT_PATH);
}

function verbose (log) {
  return function verboseInner (obj) {
    return Object.entries(obj).forEach(xs => log.verbose(`### ${xs[0]} -> ${xs[1]}`));
  };
}
