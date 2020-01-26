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

const COVERAGE_INDEX = process.env.COVERAGE_INDEX || 'kibana_code_coverage';
const TOTALS_INDEX = process.env.TOTALS_INDEX || `kibana_total_code_coverage`;
const node = process.env.ES_HOST || 'http://localhost:9200';
const redacted = redact(node);
const client = new Client({ node });

export default (obs$, log) => {
  const ms = process.env.DELAY || 0;
  log.debug(`### Code coverage indexer set to delay for: ${ms} milliseconds\n`);
  log.debug(`### Code coverage indexer set to ES_HOST (redacted): ${redacted}`);

  const postWithLogger = post.bind(null, log);

  obs$.pipe(concatMap(x => of(x).pipe(delay(ms)))).subscribe(postWithLogger);
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
    log.verbose(`
### Sent:
### ES HOST (redacted): ${redacted}
### Index: ${index}
${pretty(body)}
`);
  } catch (e) {
    const err = `
### ES HOST (redacted): \n\t${color(redacted)}
### INDEX: \n\t${color(index)}
### Partial orig err stack: \n\t${partial(e.stack)}
### BODY:\n${pretty(body)}
`;

    throw createFailError(err);
  }
}
function partial(x) {
  return x
    .split('\n')
    .splice(0, 2)
    .join('\n');
}
function redact(x) {
  const url = new URL(x);
  if (url.password) {
    return `${url.protocol}//${url.host}`;
  } else {
    return x;
  }
}
function color(x) {
  return chalk.red.bgWhiteBright(x);
}
function pretty(x) {
  return JSON.stringify(x, null, 2);
}
