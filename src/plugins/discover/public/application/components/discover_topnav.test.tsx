/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { inspectorPluginMock } from '../../../../inspector/public/mocks';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { getTopNavLinks } from './top_nav/get_top_nav_links';
import { DiscoverServices } from '../../build_services';
import { GetStateReturn } from '../angular/discover_state';
import { savedSearchMock } from '../../__mocks__/saved_search';
import { dataPluginMock } from '../../../../data/public/mocks';
import { createFilterManagerMock } from '../../../../data/public/query/filter_manager/filter_manager.mock';
import { uiSettingsMock as mockUiSettings } from '../../__mocks__/ui_settings';
import { IndexPatternAttributes } from '../../../../data/common/index_patterns';
import { SavedObject } from '../../../../../core/types';
import { navigationPluginMock } from '../../../../navigation/public/mocks';
import { DiscoverTopNav } from './discover_topnav';

function getProps() {
  const state = ({} as unknown) as GetStateReturn;
  const services = ({
    navigation: navigationPluginMock.createStartContract(),
    capabilities: {
      discover: {
        save: true,
      },
    },
    uiSettings: mockUiSettings,
  } as unknown) as DiscoverServices;
  const indexPattern = indexPatternMock;
  return {
    indexPattern: indexPatternMock,
    opts: {
      config: mockUiSettings,
      data: dataPluginMock.createStartContract(),
      filterManager: createFilterManagerMock(),
      indexPatternList: (indexPattern as unknown) as Array<SavedObject<IndexPatternAttributes>>,
      sampleSize: 10,
      savedSearch: savedSearchMock,
      setHeaderActionMenu: jest.fn(),
      timefield: indexPattern.timeFieldName || '',
      setAppState: jest.fn(),
      services,
      stateContainer: {} as GetStateReturn,
    },
    topNavMenu: getTopNavLinks({
      getFieldCounts: jest.fn(),
      indexPattern,
      inspectorAdapters: inspectorPluginMock,
      navigateTo: jest.fn(),
      savedSearch: savedSearchMock,
      services,
      state,
    }),
    state,
    updateQuery: jest.fn(),
  };
}

describe('Discover topnav component', () => {
  test('renders correctly', () => {
    const component = shallowWithIntl(<DiscoverTopNav {...getProps()} />);
    expect(component).toMatchSnapshot();
  });
});
