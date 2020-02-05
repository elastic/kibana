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

import { fromEvent, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as readline from 'readline';
import * as fs from 'fs';
import { resolve } from 'path';

const KIBANA_ROOT_PATH = '../../../../..';
const KIBANA_ROOT = resolve(__dirname, KIBANA_ROOT_PATH);
const resolvePaths = (...xs) => xs.map(x => resolve(KIBANA_ROOT, x));

const verbose = log => obj =>
  Object.entries(obj).forEach(xs => log.verbose(`### ${xs[0]} -> ${xs[1]}`));

export const parseAndPopulate = buildNumber => srcFile => destFile => log => {
  const logV = verbose(log);
  logV({ 'buildNumber': buildNumber, 'srcFile': srcFile, 'destFile': destFile });

  const [resolvedSrcFile, resolvedDestFile] = resolvePaths(srcFile, destFile);
  logV({ 'resolvedSrcFile': resolvedSrcFile, 'resolvedDestFile': resolvedDestFile });

  const input = fs.createReadStream(resolvedSrcFile);
  const rl = readline.createInterface({ input });

  const prok = x => {
    console.log(`\n### x: \n\t${x}`);
  };

  const lines$ = fromEvent(rl, 'line');
  lines$.pipe(takeUntil(fromEvent(rl, 'close')))
    .subscribe(
      prok,
      err => console.log('Error: %s', err),
      () => console.log('Completed'));

};

