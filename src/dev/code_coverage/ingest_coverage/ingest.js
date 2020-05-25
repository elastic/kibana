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
import { green, always, pretty } from './utils';
import { fromNullable } from './either';
import { COVERAGE_INDEX, TOTALS_INDEX } from './constants';

const node = process.env.ES_HOST || 'http://localhost:9200';
const redacted = redact(node);
const client = new Client({ node });

const indexName = (body) => (body.isTotal ? TOTALS_INDEX : COVERAGE_INDEX);

export const ingest = (log) => async (body) => {
  const index = indexName(body);

  if (process.env.NODE_ENV === 'integration_test') {
    log.debug(`### Just Logging, ${green('NOT actually sending')} to [${green(index)}]`);
    logSuccess(log, index, body);
  } else {
    try {
      log.debug(`### Actually sending to: ${green(index)}`);
      await client.index({ index, body });
      logSuccess(log, index, body);
    } catch (e) {
      throw createFailError(errMsg(index, body, e));
    }
  }
};
function logSuccess(log, index, body) {
  const logShort = () => `### Sent:
### ES HOST (redacted): ${redacted}
### Index: ${green(index)}`;

  logShort();
  log.verbose(pretty(body));

  const { staticSiteUrl } = body;

  logShort();
  log.debug(`### staticSiteUrl: ${staticSiteUrl}`);
}
function errMsg(index, body, e) {
  const orig = fromNullable(e.body).fold(
    always(''),
    () => `### Orig Err:\n${pretty(e.body.error)}`
  );

  const red = color('red');

  return `
### ES HOST (redacted): \n\t${red(redacted)}
### INDEX: \n\t${red(index)}
### Partial orig err stack: \n\t${partial(e.stack)}
### Item BODY:\n${pretty(body)}
${orig}

### Troubleshooting Hint:
${red('Perhaps the coverage data was not merged properly?\n')}
`;
}

function partial(x) {
  return x.split('\n').splice(0, 2).join('\n');
}
function redact(x) {
  const url = new URL(x);
  if (url.password) {
    return `${url.protocol}//${url.host}`;
  } else {
    return x;
  }
}
function color(whichColor) {
  return function colorInner(x) {
    return chalk[whichColor].bgWhiteBright(x);
  };
}
