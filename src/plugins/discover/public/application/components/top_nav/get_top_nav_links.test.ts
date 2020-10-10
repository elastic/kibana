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
import { getTopNavLinks } from './get_top_nav_links';
import { inspectorPluginMock } from '../../../../../inspector/public/mocks';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { DiscoverServices } from '../../../build_services';
import { GetStateReturn } from '../../angular/discover_state';

const services = ({
  capabilities: {
    discover: {
      save: true,
    },
  },
} as unknown) as DiscoverServices;

const state = ({} as unknown) as GetStateReturn;

test('getTopNavLinks result', () => {
  const topNavLinks = getTopNavLinks({
    getFieldCounts: jest.fn(),
    indexPattern: indexPatternMock,
    inspectorAdapters: inspectorPluginMock,
    navigateTo: jest.fn(),
    savedSearch: savedSearchMock,
    services,
    state,
  });
  expect(topNavLinks).toMatchInlineSnapshot(`
    Array [
      Object {
        "description": "New Search",
        "id": "new",
        "label": "New",
        "run": [Function],
        "testId": "discoverNewButton",
      },
      Object {
        "description": "Save Search",
        "id": "save",
        "label": "Save",
        "run": [Function],
        "testId": "discoverSaveButton",
      },
      Object {
        "description": "Open Saved Search",
        "id": "open",
        "label": "Open",
        "run": [Function],
        "testId": "discoverOpenButton",
      },
      Object {
        "description": "Share Search",
        "id": "share",
        "label": "Share",
        "run": [Function],
        "testId": "shareTopNavButton",
      },
      Object {
        "description": "Open Inspector for search",
        "id": "inspect",
        "label": "Inspect",
        "run": [Function],
        "testId": "openInspectorButton",
      },
    ]
  `);
});
