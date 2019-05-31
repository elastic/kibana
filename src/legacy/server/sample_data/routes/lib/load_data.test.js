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

import { loadData } from './load_data';

test('load flight data', async () => {
  let myDocsCount = 0;
  const bulkInsertMock = (docs) => {
    myDocsCount += docs.length;
  };
  const count = await loadData('./src/legacy/server/sample_data/data_sets/flights/flights.json.gz', bulkInsertMock);
  expect(myDocsCount).toBe(13059);
  expect(count).toBe(13059);
});

test('load log data', async () => {
  let myDocsCount = 0;
  const bulkInsertMock = (docs) => {
    myDocsCount += docs.length;
  };
  const count = await loadData('./src/legacy/server/sample_data/data_sets/logs/logs.json.gz', bulkInsertMock);
  expect(myDocsCount).toBe(14074);
  expect(count).toBe(14074);
});

test('load ecommerce data', async () => {
  let myDocsCount = 0;
  const bulkInsertMock = (docs) => {
    myDocsCount += docs.length;
  };
  const count = await loadData('./src/legacy/server/sample_data/data_sets/ecommerce/ecommerce.json.gz', bulkInsertMock);
  expect(myDocsCount).toBe(4675);
  expect(count).toBe(4675);
});
