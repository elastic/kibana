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


import { debounce } from 'lodash';
import { kfetch } from 'ui/kfetch';

/**
 * Expressions Service
 * @internal
 */
export class BFetchService {
  public setup() {

    const requests: Array<any> = [];
    let lastId = 0;

    const getResponse = debounce(() => {
      const currentRequests = [];
      while (requests.length) currentRequests.push(requests.pop());
      return kfetch({ method: 'GET', pathname: 'api/bfetch', body: JSON.stringify(currentRequests) });
    }, 200);

    const addRequest = (opts: any) => {
      const newId = ++lastId;
      requests.push({ ...opts, id: newId });
      return newId;
    };

    const bfetch = (opts: any) => {
      const id = addRequest(opts);

      return new Promise(async (resolve, reject) => {
        const response = await getResponse();
        resolve(response[id]);
      })
    };

    return {
      bfetch,
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public */
export type BFetchSetup = ReturnType<BFetchService['setup']>;
