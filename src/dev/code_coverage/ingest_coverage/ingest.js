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

const COVERAGE_INDEX = process.env.COVERAGE_INDEX || 'kibana_code_coverage';
const TOTALS_INDEX = process.env.TOTALS_INDEX || `kibana_total_code_coverage`;
const node = process.env.ES_HOST || 'http://localhost:9200';
const redacted = redact(node);
const client = new Client({ node });

export const ingest = log => async body => {
  const  index = (!body.coveredFilePath) ? TOTALS_INDEX : COVERAGE_INDEX;

  try {
    await client.index({ index, body });
    log.verbose(`
### Sent:
### ES HOST (redacted): ${redacted}
### Index: ${index}
${pretty(body)}
`);
  } catch (e) {
    const red = color('red');
    const err = `
### ES HOST (redacted): \n\t${red(redacted)}
### INDEX: \n\t${red(index)}
### Partial orig err stack: \n\t${partial(e.stack)}
### Item BODY:\n${pretty(body)}
### Orig Err:\n${pretty(e.body.error)}

### Troubleshooting Hint:
${red('Perhaps the coverage data was not merged properly?\n')}
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
function color(whichColor) {
  return function colorInner(x) {
    return chalk[whichColor].bgWhiteBright(x);
  }
}
function pretty(x) {
  return JSON.stringify(x, null, 2);
}
