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

import { SearchCache } from './search_cache';
jest.mock('../services');

describe(`SearchCache`, () => {
  class FauxEs {
    constructor() {
      // contains all request batches, separated by 0
      this.searches = [];
    }

    async search(request) {
      this.searches.push(request);
      return { req: request };
    }
  }

  const request1 = { body: 'b1' };
  const expected1 = { req: { body: 'b1' } };
  const request2 = { body: 'b2' };
  const expected2 = { req: { body: 'b2' } };
  const request3 = { body: 'b3' };
  const expected3 = { req: { body: 'b3' } };

  it(`sequence`, async () => {
    const sc = new SearchCache(new FauxEs());

    // empty request
    let res = await sc.search([]);
    expect(res).toEqual([]);
    expect(sc._es.searches).toEqual([]);

    // single request
    res = await sc.search([request1]);
    expect(res).toEqual([expected1]);
    expect(sc._es.searches).toEqual([request1]);

    // repeat the same search, use array notation
    res = await sc.search([request1]);
    expect(res).toEqual([expected1]);
    expect(sc._es.searches).toEqual([request1]); // no new entries

    // new single search
    res = await sc.search([request2]);
    expect(res).toEqual([expected2]);
    expect(sc._es.searches).toEqual([request1, request2]);

    // multiple search, some new, some old
    res = await sc.search([request1, request3, request2]);
    expect(res).toEqual([expected1, expected3, expected2]);
    expect(sc._es.searches).toEqual([request1, request2, request3]);
  });
});
