/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTopNavLinks } from './get_top_nav_links';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DiscoverServices } from '../../../../build_services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';

describe('getTopNavLinks', () => {
  const services = {
    ...createDiscoverServicesMock(),
    capabilities: {
      discover: {
        save: true,
      },
    },
    uiSettings: {
      get: jest.fn(() => true),
    },
  } as unknown as DiscoverServices;

  const state = getDiscoverStateMock({ isTimeBased: true });
  state.actions.setDataView(dataViewMock);

  test('getTopNavLinks result', () => {
    const topNavLinks = getTopNavLinks({
      dataView: dataViewMock,
      onOpenInspector: jest.fn(),
      services,
      state,
      isEsqlMode: false,
      adHocDataViews: [],
      topNavCustomization: undefined,
      shouldShowESQLToDataViewTransitionModal: false,
    });
    expect(topNavLinks).toMatchInlineSnapshot(`
    Array [
      Object {
        "color": "text",
        "emphasize": true,
        "fill": false,
        "id": "esql",
        "label": "Try ES|QL",
        "run": [Function],
        "testId": "select-text-based-language-btn",
        "tooltip": "ES|QL is Elastic's powerful new piped query language.",
      },
      Object {
        "description": "Open Inspector for search",
        "id": "inspect",
        "label": "Inspect",
        "run": [Function],
        "testId": "openInspectorButton",
      },
      Object {
        "description": "New Search",
        "iconOnly": true,
        "iconType": "plus",
        "id": "new",
        "label": "New",
        "run": [Function],
        "testId": "discoverNewButton",
      },
      Object {
        "description": "Open Saved Search",
        "iconOnly": true,
        "iconType": "folderOpen",
        "id": "open",
        "label": "Open",
        "run": [Function],
        "testId": "discoverOpenButton",
      },
      Object {
        "description": "Share Search",
        "iconOnly": true,
        "iconType": "link",
        "id": "share",
        "label": "Share",
        "run": [Function],
        "testId": "shareTopNavButton",
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
      isEsqlMode: true,
      adHocDataViews: [],
      topNavCustomization: undefined,
      shouldShowESQLToDataViewTransitionModal: false,
    });
    expect(topNavLinks).toMatchInlineSnapshot(`
    Array [
      Object {
        "color": "text",
        "emphasize": true,
        "fill": false,
        "id": "esql",
        "label": "Switch to classic",
        "run": [Function],
        "testId": "switch-to-dataviews",
        "tooltip": "Switch to KQL or Lucene syntax.",
      },
      Object {
        "description": "Open Inspector for search",
        "id": "inspect",
        "label": "Inspect",
        "run": [Function],
        "testId": "openInspectorButton",
      },
      Object {
        "description": "New Search",
        "iconOnly": true,
        "iconType": "plus",
        "id": "new",
        "label": "New",
        "run": [Function],
        "testId": "discoverNewButton",
      },
      Object {
        "description": "Open Saved Search",
        "iconOnly": true,
        "iconType": "folderOpen",
        "id": "open",
        "label": "Open",
        "run": [Function],
        "testId": "discoverOpenButton",
      },
      Object {
        "description": "Share Search",
        "iconOnly": true,
        "iconType": "link",
        "id": "share",
        "label": "Share",
        "run": [Function],
        "testId": "shareTopNavButton",
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
});
