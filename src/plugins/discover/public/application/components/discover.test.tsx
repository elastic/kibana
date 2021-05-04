/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subject } from 'rxjs';

import { shallowWithIntl } from '@kbn/test/jest';
import { setHeaderActionMenuMounter } from '../../kibana_services';

import { Discover } from './discover';
import { esHits } from '../../__mocks__/es_hits';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { DiscoverServices } from '../../build_services';
import { savedSearchMock } from '../../__mocks__/saved_search';
import { createSearchSourceMock } from '../../../../data/common/search/search_source/mocks';
import { uiSettingsMock as mockUiSettings } from '../../__mocks__/ui_settings';
import { IndexPattern, IndexPatternAttributes } from '../../../../data/common/index_patterns';
import { SavedObject } from '../../../../../core/types';
import { navigationPluginMock } from '../../../../navigation/public/mocks';
import { indexPatternWithTimefieldMock } from '../../__mocks__/index_pattern_with_timefield';
import { fetchStatuses } from './constants';
import { UseSavedSearch } from './use_saved_search';
import { DiscoverSearchSessionManager } from '../angular/discover_search_session';
import { GetStateReturn } from '../angular/discover_state';

const mockNavigation = navigationPluginMock.createStartContract();
setHeaderActionMenuMounter(jest.fn());

function getProps(indexPattern: IndexPattern) {
  const searchSourceMock = createSearchSourceMock({});
  const services = ({
    metadata: {
      branch: 'test',
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
    navigation: mockNavigation,
  } as unknown) as DiscoverServices;

  const useSavedSearchMock = ({
    rows: esHits,
    fetchStatus: fetchStatuses.COMPLETE,
    fetch$: new Subject(),
  } as unknown) as UseSavedSearch;

  return {
    indexPattern,
    opts: {
      indexPatternList: (indexPattern as unknown) as Array<SavedObject<IndexPatternAttributes>>,
      navigateTo: jest.fn(),
      savedSearch: savedSearchMock,
      services,
      routeReload: jest.fn(),
    },
    resetQuery: jest.fn(),
    useSavedSearch: useSavedSearchMock,
    searchSource: searchSourceMock,
    searchSessionManager: {} as DiscoverSearchSessionManager,
    state: { columns: [] },
    stateContainer: {} as GetStateReturn,
  };
}

describe('Discover component', () => {
  test('selected index pattern without time field displays no chart toggle', () => {
    const component = shallowWithIntl(<Discover {...getProps(indexPatternMock)} />);
    expect(component.find('[data-test-subj="discoverChartToggle"]').length).toBe(0);
  });
  test('selected index pattern with time field displays chart toggle', () => {
    const component = shallowWithIntl(<Discover {...getProps(indexPatternWithTimefieldMock)} />);
    expect(component.find('[data-test-subj="discoverChartToggle"]').length).toBe(1);
  });
});
