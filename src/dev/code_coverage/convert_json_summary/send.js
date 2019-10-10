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

import Wreck from '@hapi/wreck';
import { of } from 'rxjs';
import { delay, concatMap } from 'rxjs/operators';

const wreck = Wreck.defaults({
  baseUrl: 'http://localhost:9200',
});

export default obs$ => {
  obs$
    .pipe(concatMap(x => of(x).pipe(delay(50))))
    .subscribe(async payload => {
      const { path } = payload;
      try {
        await wreck.post('kibana_coverage/_doc', { payload });
        console.log(`\n### Posted coverage for\n\t${path}`);
      } catch (e) {
        console.error(`\n### Failed to post ${path}`);
      }
    });
};
