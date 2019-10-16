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

const { Client } = require('@elastic/elasticsearch');
import { createFailError } from '@kbn/dev-utils';
import chalk from 'chalk';
import { of } from 'rxjs';
import { delay, concatMap } from 'rxjs/operators';

const COVERAGE_INDEX = process.env.COVERAGE_INDEX || 'kibana_coverage';
const TOTALS_INDEX = `${COVERAGE_INDEX}_totals`;
const client = new Client({ node: process.env.ES_SERVER || 'http://localhost:9200' });

export default (obs$, log) => {
  const ms = process.env.DELAY || 50;
  log.verbose(`Code coverage sender set to delay for ${ms} milliseconds\n`);

  const postWithLogger = post.bind(null, log);

  obs$
    .pipe(concatMap(x => of(x).pipe(delay(ms))))
    .subscribe(postWithLogger);

};
async function post(log, body) {
  let index = '';
  if (!body.coveredFilePath) {
    index = TOTALS_INDEX;
  } else {
    index = COVERAGE_INDEX;
  }

  try {
    await client.index({ index, body });
    log.verbose('\nSent to es:\n', JSON.stringify(body,  null, 2));
  } catch (e) {
    const { coverageType } = body;
    const msg = 'Failed attempting to post coverage for ';
    const err = `
${chalk.red.bgWhiteBright(msg + coverageType)}, \nPartial orig err stack: \n[\n\t${partial(e.stack)}\n]`;
    throw createFailError(err);
  }
}
function partial(x) {
  return x.split('\n').splice(0, 2).join('\n');
}
