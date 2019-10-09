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

import { resolve } from 'path';
import { createReadStream } from 'fs';
import { fromEventPattern } from 'rxjs';
import moment from 'moment';
import oboe from 'oboe';

const kibanaRoot = resolve(__dirname, '../../../..');
const path = resolve(kibanaRoot, './target/kibana-coverage/mocha/coverage-summary.json');

const result = [];

const jsonStream = oboe(createReadStream(path))
  .on('done', () => {
    result.forEach(x => console.log(`\n### x: \n\t${JSON.stringify(x, null, 2)}`));
    console.log('\n### done');
  });

const nodes$ = fromEventPattern(handler => jsonStream.on('node', '!.*', handler));

nodes$
  .subscribe(function jsonStreamSubscriptionHandler(...args)  {
    const [name] = args[0][1];
    const [stats] = args[0];
    const obj = {
      '@timestamp': moment().format(),
      'path': name.includes('kibana') ? name.replace(/.*kibana\//, '') : name,
      ...stats,
    };
    result.push(obj);
  });
