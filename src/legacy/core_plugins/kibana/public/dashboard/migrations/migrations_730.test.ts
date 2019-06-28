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

import { migrations730 } from './migrations_730';
import { DashboardDoc } from './types';

test('dashboard migration 7.3.0 migrates filters to query on search source', () => {
  const doc: DashboardDoc = {
    id: '1',
    type: 'dashboard',
    references: [],
    attributes: {
      description: '',
      uiStateJSON: '{}',
      version: 1,
      timeRestore: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"filter":[{"query":{"query_string":{"query":"n: 6","analyze_wildcard":true}}}],"highlightAll":true,"version":true}',
      },
      panelsJSON:
        '[{"id":"1","type":"visualization","foo":true},{"id":"2","type":"visualization","bar":true}]',
    },
  };
  const newDoc = migrations730(doc);

  expect(newDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "description": "",
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"filter\\":[],\\"highlightAll\\":true,\\"version\\":true,\\"query\\":{\\"query\\":\\"n: 6\\",\\"language\\":\\"lucene\\"}}",
    },
    "panelsJSON": "[{\\"id\\":\\"1\\",\\"type\\":\\"visualization\\",\\"foo\\":true},{\\"id\\":\\"2\\",\\"type\\":\\"visualization\\",\\"bar\\":true}]",
    "timeRestore": false,
    "uiStateJSON": "{}",
    "version": 1,
  },
  "id": "1",
  "references": Array [],
  "type": "dashboard",
}
`);
});
