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
import { IndexPattern } from '../../../../data/public/index_patterns';
// the last time when the user popularized a field
let popularized: number = 0;
// the time of the last populasization that was persisted
let persisted: number = 0;
let currentIndexPattern: IndexPattern;
let initialized: boolean = false;

/**
 * helper function providing a timeout functionality
 */
async function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * starts the persistence loop, there's just 1 persistence operation possible to prevent
 * Elasticsearch 409 errors, if there have been more changes while persisting
 * those are persisted afterwards. changes are checked every second
 */
export async function start() {
  while (true) {
    if (popularized !== persisted && currentIndexPattern) {
      // wait another second for another user input, like selecting another column
      await timeout(1000);
      persisted = popularized;
      try {
        await currentIndexPattern.save();
      } catch (e) {
        // wait 10 sec, might be a network issue, reset persisted to try again
        persisted = 0;
        await timeout(10000);
      }
    }
    await timeout(1000);
  }
}

/**
 * increases a field's count value by 1 and persists the index pattern
 */
export function popularizeField(field: string, indexPattern: IndexPattern) {
  popularized = Date.now();
  currentIndexPattern = indexPattern;
  indexPattern.popularizeField(field, 1, false);
  if (!initialized) {
    start();
    initialized = true;
  }
}
