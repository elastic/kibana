/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { uiSettingsMock as mockUiSettings } from '../../../__mocks__/ui_settings';
import { mockTopNavMenu } from './__mocks__/top_nav_menu';
import { ContextAppContent } from './context_app_content';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { ContextApp } from './context_app';

jest.mock('../../../kibana_services', () => {
  return {
    getServices: () => ({
      data: { search: { searchSource: { createEmpty: () => {} } } },
      indexPatterns: {},
      capabilities: {
        discover: {
          save: true,
        },
      },
      uiSettings: mockUiSettings,
      navigation: { ui: { TopNavMenu: mockTopNavMenu } },
    }),
  };
});

jest.mock('./use_context_app_state', () => {
  return {
    useContextAppState: () => ({
      setAppState: () => {},
      stateContainer: {},
      appState: { sort: [[1603114502000, 2092]] },
    }),
  };
});

jest.mock('./use_context_app_fetch', () => {
  return {
    useContextAppFetch: () => ({
      fetchedState: {
        anchor: { _id: 'mock_id', fields: [] },
        predecessors: [],
        successors: [],
        anchorStatus: { value: 'loaded' },
        predecessorsStatus: { value: 'loaded' },
        successorsStatus: { value: 'loaded' },
      },
      fetchAllRows: () => {},
      fetchContextRows: () => {},
      fetchSurroundingRows: () => {},
    }),
  };
});

describe('ContextApp test', () => {
  const defaultProps = {
    indexPattern: indexPatternMock,
    indexPatternId: 'mocked_index_pattern',
    anchorId: 'mocked_anchor_id',
  };

  const topNavProps = {
    appName: 'context',
    showSearchBar: true,
    showQueryBar: false,
    showFilterBar: true,
    showSaveQuery: false,
    showDatePicker: false,
    indexPatterns: [indexPatternMock],
    useDefaultBehaviors: true,
  };

  it('renders correctly', () => {
    const component = mountWithIntl(<ContextApp {...defaultProps} />);
    expect(component.find(ContextAppContent).length).toBe(1);
    const topNavMenu = component.find(mockTopNavMenu);
    expect(topNavMenu.length).toBe(1);
    expect(topNavMenu.props()).toStrictEqual(topNavProps);
  });
});
