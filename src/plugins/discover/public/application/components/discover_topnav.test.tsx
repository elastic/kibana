/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { DiscoverServices } from '../../build_services';
import { savedSearchMock } from '../../__mocks__/saved_search';
import { uiSettingsMock as mockUiSettings } from '../../__mocks__/ui_settings';
import { DiscoverTopNav, DiscoverTopNavProps } from './discover_topnav';
import { TopNavMenu } from '../../../../navigation/public';
import { ISearchSource, Query } from '../../../../data/common';
import { GetStateReturn } from '../angular/discover_state';
import { setHeaderActionMenuMounter } from '../../kibana_services';

setHeaderActionMenuMounter(jest.fn());

function getProps(): DiscoverTopNavProps {
  const services = ({
    navigation: {
      ui: { TopNavMenu },
    },
    capabilities: {
      discover: {
        save: true,
      },
      advancedSettings: {
        save: true,
      },
    },
    uiSettings: mockUiSettings,
  } as unknown) as DiscoverServices;
  return {
    stateContainer: {} as GetStateReturn,
    indexPattern: indexPatternMock,
    savedSearch: savedSearchMock,
    navigateTo: jest.fn(),
    services,
    query: {} as Query,
    savedQuery: '',
    updateQuery: jest.fn(),
    onOpenInspector: jest.fn(),
    searchSource: {} as ISearchSource,
  };
}

describe('Discover topnav component', () => {
  test('setHeaderActionMenu was called', () => {
    const props = getProps();
    const component = shallowWithIntl(<DiscoverTopNav {...props} />);
    expect(component).toMatchInlineSnapshot(`
      <TopNavMenu
        appName="discover"
        config={
          Array [
            Object {
              "description": "Options",
              "id": "options",
              "label": "Options",
              "run": [Function],
              "testId": "discoverOptionsButton",
            },
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
        }
        indexPatterns={
          Array [
            Object {
              "docvalueFields": Array [],
              "fields": Array [
                Object {
                  "aggregatable": false,
                  "filterable": false,
                  "name": "_source",
                  "scripted": false,
                  "type": "_source",
                },
                Object {
                  "aggregatable": false,
                  "filterable": true,
                  "name": "_index",
                  "scripted": false,
                  "type": "string",
                },
                Object {
                  "aggregatable": false,
                  "filterable": false,
                  "name": "message",
                  "scripted": false,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "filterable": true,
                  "name": "extension",
                  "scripted": false,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "filterable": true,
                  "name": "bytes",
                  "scripted": false,
                  "type": "number",
                },
                Object {
                  "filterable": false,
                  "name": "scripted",
                  "scripted": true,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "filterable": true,
                  "name": "object.value",
                  "scripted": false,
                  "type": "number",
                },
              ],
              "flattenHit": [Function],
              "formatField": [Function],
              "formatHit": [MockFunction],
              "getComputedFields": [Function],
              "getFieldByName": [MockFunction],
              "getFormatterForField": [Function],
              "getSourceFiltering": [Function],
              "id": "the-index-pattern-id",
              "isTimeBased": [Function],
              "metaFields": Array [
                "_index",
                "_score",
              ],
              "timeFieldName": "",
              "title": "the-index-pattern-title",
            },
          ]
        }
        onQuerySubmit={[MockFunction]}
        onSavedQueryIdChange={[Function]}
        query={Object {}}
        savedQueryId=""
        screenTitle=""
        setMenuMountPoint={[MockFunction]}
        showDatePicker={false}
        showFilterBar={true}
        showQueryBar={true}
        showQueryInput={true}
        showSaveQuery={false}
        showSearchBar={true}
        useDefaultBehaviors={true}
      />
    `);
  });
});
