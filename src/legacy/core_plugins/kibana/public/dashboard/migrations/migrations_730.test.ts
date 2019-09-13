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

import { migrations } from '../../../migrations/';
import { migrations730 } from './migrations_730';
import {
  DashboardDoc700To720,
  DashboardDoc730ToLatest,
  RawSavedDashboardPanel730ToLatest,
  DashboardDocPre700,
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
      title: 'hi',
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
        "title": "hi",
        "useMargins": true,
        "version": 1,
      },
      "id": "1",
      "references": Array [],
      "type": "dashboard",
    }
  `);
});

// See https://github.com/elastic/kibana/issues/41240 - this can happen.
test('dashboard migration 7.3.0 migrates filters to query on search source when there is no query string property', () => {
  const doc: DashboardDocPre700 = {
    id: 'AWviOturFv4p9HkVSIgn',
    type: 'dashboard',
    attributes: {
      title: 'all_the_viz',
      description: '',
      panelsJSON:
        '[{"col":1,"columns":["_source"],"id":"AWviL7GTFv4p9HkVSIf8","panelIndex":1,"row":1,"size_x":6,"size_y":3,"sort":["@timestamp","desc"],"type":"search"},{"col":7,"id":"AWviMFurFv4p9HkVSIf9","panelIndex":2,"row":1,"size_x":6,"size_y":3,"type":"visualization"},{"col":1,"id":"AWviMOBlFv4p9HkVSIf-","panelIndex":3,"row":4,"size_x":6,"size_y":3,"type":"visualization"},{"col":7,"id":"AWviMZ6SFv4p9HkVSIf_","panelIndex":4,"row":4,"size_x":6,"size_y":3,"type":"visualization"},{"col":1,"id":"AWviMqdpFv4p9HkVSIgK","panelIndex":5,"row":7,"size_x":6,"size_y":3,"type":"visualization"},{"col":7,"id":"AWviM0kxFv4p9HkVSIga","panelIndex":6,"row":7,"size_x":6,"size_y":3,"type":"visualization"},{"col":1,"id":"AWviM_UOFv4p9HkVSIgb","panelIndex":7,"row":10,"size_x":6,"size_y":3,"type":"visualization"},{"col":7,"id":"AWviNMDaFv4p9HkVSIgc","panelIndex":8,"row":10,"size_x":6,"size_y":3,"type":"visualization"},{"col":1,"id":"AWviNR7vFv4p9HkVSIgd","panelIndex":9,"row":13,"size_x":6,"size_y":3,"type":"visualization"},{"col":7,"id":"AWviNcPPFv4p9HkVSIge","panelIndex":10,"row":13,"size_x":6,"size_y":3,"type":"visualization"},{"col":1,"id":"AWviNu5XFv4p9HkVSIgf","panelIndex":11,"row":16,"size_x":6,"size_y":3,"type":"visualization"},{"col":7,"id":"AWviN5pxFv4p9HkVSIgg","panelIndex":12,"row":16,"size_x":6,"size_y":3,"type":"visualization"},{"col":1,"id":"AWviN_qeFv4p9HkVSIgh","panelIndex":13,"row":19,"size_x":6,"size_y":3,"type":"visualization"},{"col":7,"id":"AWviOI-XFv4p9HkVSIgi","panelIndex":14,"row":19,"size_x":6,"size_y":3,"type":"visualization"},{"col":1,"id":"AWviOP2GFv4p9HkVSIgj","panelIndex":15,"row":22,"size_x":6,"size_y":3,"type":"visualization"},{"col":7,"id":"AWviOYpkFv4p9HkVSIgk","panelIndex":16,"row":22,"size_x":6,"size_y":3,"type":"visualization"},{"col":1,"id":"AWviOilNFv4p9HkVSIgl","panelIndex":17,"row":25,"size_x":6,"size_y":3,"type":"visualization"},{"col":7,"id":"AWviOpW1Fv4p9HkVSIgm","panelIndex":18,"row":25,"size_x":6,"size_y":3,"type":"visualization"}]',
      optionsJSON: '{"darkTheme":false}',
      uiStateJSON:
        '{"P-9":{"vis":{"params":{"sort":{"columnIndex":null,"direction":null}}}},"P-3":{"vis":{"defaultColors":{"0 - 88":"rgb(247,252,245)","88 - 175":"rgb(199,233,192)","175 - 263":"rgb(116,196,118)","263 - 350":"rgb(35,139,69)"}}},"P-10":{"vis":{"defaultColors":{"0 - 50":"rgb(0,104,55)","50 - 75":"rgb(255,255,190)","75 - 100":"rgb(165,0,38)"}}},"P-11":{"vis":{"defaultColors":{"0 - 100":"rgb(0,104,55)"}}},"P-12":{"vis":{"defaultColors":{"0 - 100":"rgb(0,104,55)"}}}}',
      version: 1,
      timeRestore: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"filter":[{"query":{"match_all":{}}}],"highlightAll":true,"version":true}',
      },
    },
  };

  const doc700: DashboardDoc700To720 = migrations.dashboard['7.0.0'](doc, mockLogger);
  const newDoc = migrations.dashboard['7.3.0'](doc700, mockLogger);

  const parsedSearchSource = JSON.parse(newDoc.attributes.kibanaSavedObjectMeta.searchSourceJSON);
  expect(parsedSearchSource.filter.length).toBe(0);
  expect(parsedSearchSource.query.query).toBe('');

  expect(newDoc.attributes.uiStateJSON).toBeUndefined();
});

// See https://github.com/elastic/kibana/issues/44639 - apparently this can happen.
test('dashboard migration works when panelsJSON is missing panelIndex', () => {
  const doc: DashboardDoc700To720 = {
    id: '1',
    type: 'dashboard',
    references: [],
    attributes: {
      description: '',
      uiStateJSON: '{}',
      title: 'fancy stuff',
      timeRestore: true,
      version: 1,
      panelsJSON:
        '[{"id":"funky-funky","type":"visualization","size_x":7,"size_y":5,"col":1,"row":1},{"id":"funky-funky2","type":"search","size_x":5,"size_y":5,"col":8,"row":1,"columns":["_source"],"sort":["@timestamp","desc"]}]',
      optionsJSON: '{"darkTheme":false}',
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"filter":[{"query":{"query_string":{"query":"user:spiderman","analyze_wildcard":true}}}]}',
      },
    },
  };

  const doc700: DashboardDoc700To720 = migrations.dashboard['7.0.0'](doc, mockLogger);
  const newDoc = migrations.dashboard['7.3.0'](doc700, mockLogger);

  const parsedSearchSource = JSON.parse(newDoc.attributes.kibanaSavedObjectMeta.searchSourceJSON);
  expect(parsedSearchSource.filter.length).toBe(0);
  expect(parsedSearchSource.query.query).toBe('user:spiderman');

  expect(newDoc.attributes.uiStateJSON).toBeUndefined();
});

test('dashboard migration 7.3.0 migrates panels', () => {
  const doc: DashboardDoc700To720 = {
    id: '1',
    type: 'dashboard',
    references: [],
    attributes: {
      title: 'hi',
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
