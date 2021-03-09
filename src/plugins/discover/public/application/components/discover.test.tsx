/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { Discover } from './discover';
import { esHits } from '../../__mocks__/es_hits';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { DiscoverServices } from '../../build_services';
import { GetStateReturn } from '../angular/discover_state';
import { savedSearchMock } from '../../__mocks__/saved_search';
import { createSearchSourceMock } from '../../../../data/common/search/search_source/mocks';
import { dataPluginMock } from '../../../../data/public/mocks';
import { createFilterManagerMock } from '../../../../data/public/query/filter_manager/filter_manager.mock';
import { uiSettingsMock as mockUiSettings } from '../../__mocks__/ui_settings';
import { IndexPattern, IndexPatternAttributes } from '../../../../data/common/index_patterns';
import { SavedObject } from '../../../../../core/types';
import { navigationPluginMock } from '../../../../navigation/public/mocks';
import { indexPatternWithTimefieldMock } from '../../__mocks__/index_pattern_with_timefield';
import { calcFieldCounts } from '../helpers/calc_field_counts';
import { DiscoverProps } from './types';
import { RequestAdapter } from '../../../../inspector/common';
import { Subject } from 'rxjs';
import { DiscoverSearchSessionManager } from '../angular/discover_search_session';

const mockNavigation = navigationPluginMock.createStartContract();

jest.mock('../../kibana_services', () => {
  return {
    getServices: () => ({
      metadata: {
        branch: 'test',
      },
      capabilities: {
        discover: {
          save: true,
        },
      },
      navigation: mockNavigation,
      uiSettings: mockUiSettings,
    }),
  };
});

function getProps(indexPattern: IndexPattern): DiscoverProps {
  const searchSourceMock = createSearchSourceMock({});
  const services = ({
    capabilities: {
      discover: {
        save: true,
      },
    },
    uiSettings: mockUiSettings,
  } as unknown) as DiscoverServices;

  return {
    fetch: jest.fn(),
    fetchCounter: 0,
    fetchError: undefined,
    fieldCounts: calcFieldCounts({}, esHits, indexPattern),
    hits: esHits.length,
    indexPattern,
    minimumVisibleRows: 10,
    onSkipBottomButtonClick: jest.fn(),
    opts: {
      config: mockUiSettings,
      data: dataPluginMock.createStartContract(),
      filterManager: createFilterManagerMock(),
      getFieldCounts: jest.fn(),
      indexPatternList: (indexPattern as unknown) as Array<SavedObject<IndexPatternAttributes>>,
      inspectorAdapters: { requests: {} as RequestAdapter },
      navigateTo: jest.fn(),
      refetch$: {} as Subject<undefined>,
      sampleSize: 10,
      savedSearch: savedSearchMock,
      searchSessionManager: {} as DiscoverSearchSessionManager,
      setHeaderActionMenu: jest.fn(),
      timefield: indexPattern.timeFieldName || '',
      setAppState: jest.fn(),
      services,
      stateContainer: {} as GetStateReturn,
    },
    resetQuery: jest.fn(),
    resultState: 'ready',
    rows: esHits,
    searchSource: searchSourceMock,
    state: { columns: [] },
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
