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

import { Readable } from 'stream';

/**
 *  Create a Readable stream that provides the items
 *  from a list as objects to subscribers
 *
 *  @param  {Array<any>} items - the list of items to provide
 *  @return {Readable}
 */
export function createListStream(items = []) {
  const queue = [].concat(items);

  return new Readable({
    objectMode: true,
    read(size) {
      queue.splice(0, size).forEach(item => {
        this.push(item);
      });

      if (!queue.length) {
        this.push(null);
      }
    },
  });
}
