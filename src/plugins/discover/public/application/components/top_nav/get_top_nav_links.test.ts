/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISearchSource } from 'src/plugins/data/public';
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
    onOpenInspector: jest.fn(),
    savedSearch: savedSearchMock,
    services,
    state,
    searchSource: {} as ISearchSource,
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
