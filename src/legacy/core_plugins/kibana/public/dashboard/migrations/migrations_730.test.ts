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
import {
  DashboardDoc700To720,
  DashboardDoc730ToLatest,
  RawSavedDashboardPanel730ToLatest,
} from './types';

const mockLogger = {
  warning: () => {},
  debug: () => {},
  info: () => {},
};

test('dashboard migration 7.3.0 migrates filters to query on search source', () => {
  const doc: DashboardDoc700To720 = {
    id: '1',
    type: 'dashboard',
    references: [],
    attributes: {
      useMargins: true,
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
  const newDoc = migrations730(doc, mockLogger);

  expect(newDoc).toMatchInlineSnapshot(`
Object {
  "attributes": Object {
    "description": "",
    "kibanaSavedObjectMeta": Object {
      "searchSourceJSON": "{\\"filter\\":[],\\"highlightAll\\":true,\\"version\\":true,\\"query\\":{\\"query\\":\\"n: 6\\",\\"language\\":\\"lucene\\"}}",
    },
    "panelsJSON": "[{\\"id\\":\\"1\\",\\"type\\":\\"visualization\\",\\"foo\\":true},{\\"id\\":\\"2\\",\\"type\\":\\"visualization\\",\\"bar\\":true}]",
    "timeRestore": false,
    "useMargins": true,
    "version": 1,
  },
  "id": "1",
  "references": Array [],
  "type": "dashboard",
}
`);
});

test('dashboard migration 7.3.0 migrates panels', () => {
  const doc: DashboardDoc700To720 = {
    id: '1',
    type: 'dashboard',
    references: [],
    attributes: {
      useMargins: true,
      description: '',
      uiStateJSON: '{}',
      version: 1,
      timeRestore: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"filter":[],"highlightAll":true,"version":true}',
      },
      panelsJSON:
        '[{"size_x":6,"size_y":3,"panelIndex":1,"type":"visualization","id":"AWtIUP8QRNXhJVz2_Mar","col":1,"row":1}]',
    },
  };

  const newDoc = migrations730(doc, mockLogger) as DashboardDoc730ToLatest;

  const newPanels = JSON.parse(newDoc.attributes.panelsJSON) as RawSavedDashboardPanel730ToLatest[];

  expect(newPanels.length).toBe(1);
  expect(newPanels[0].gridData.w).toEqual(24);
  expect(newPanels[0].gridData.h).toEqual(12);
  expect(newPanels[0].gridData.x).toEqual(0);
  expect(newPanels[0].gridData.y).toEqual(0);
  expect(newPanels[0].panelIndex).toEqual('1');
});
