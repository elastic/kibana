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
// import { of } from 'rxjs';
// import { delay, concatMap } from 'rxjs/operators';
import { createFailError } from '@kbn/dev-utils';
import chalk from 'chalk';

const index = 'kibana_coverage';
const client = new Client({ node: 'http://localhost:9200' });

export default (obs$, log) => {
  // const ms = 50;
  // log.verbose(`Code coverage sender set to delay for ${ms} milliseconds\n`);

  obs$
  // .pipe(concatMap(x => of(x).pipe(delay(ms)))) // Slow down the requests
    .subscribe(async body => {
      const { path } = body;
      try {
        await client.index({ index, body });
        log.debug(`Posted coverage for\n\t${path}`);
      } catch (e) {
        const msg = 'Failed attempting to post coverage for ';
        const err = `
${chalk.red.bgWhiteBright(msg + path)}, \nPartial orig err stack: \n[\n\t${partial(e.stack)}\n]`;
        throw createFailError(err);
      }
    });
};
function partial(x) {
  return x.split('\n').splice(0, 2).join('\n');
}
