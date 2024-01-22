/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTopNavLinks } from './get_top_nav_links';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverStateContainer } from '../../services/discover_state';

const services = {
  capabilities: {
    discover: {
      save: true,
    },
  },
} as unknown as DiscoverServices;

const state = {} as unknown as DiscoverStateContainer;

test('getTopNavLinks result', () => {
  const topNavLinks = getTopNavLinks({
    dataView: dataViewMock,
    onOpenInspector: jest.fn(),
    services,
    state,
    isTextBased: false,
    adHocDataViews: [],
    topNavCustomization: undefined,
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
      Object {
        "description": "Save Search",
        "emphasize": true,
        "iconType": "save",
        "id": "save",
        "label": "Save",
        "run": [Function],
        "testId": "discoverSaveButton",
      },
    ]
  `);
});

test('getTopNavLinks result for ES|QL mode', () => {
  const topNavLinks = getTopNavLinks({
    dataView: dataViewMock,
    onOpenInspector: jest.fn(),
    services,
    state,
    isTextBased: true,
    adHocDataViews: [],
    topNavCustomization: undefined,
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
      Object {
        "description": "Save Search",
        "emphasize": true,
        "iconType": "save",
        "id": "save",
        "label": "Save",
        "run": [Function],
        "testId": "discoverSaveButton",
      },
    ]
  `);
});
