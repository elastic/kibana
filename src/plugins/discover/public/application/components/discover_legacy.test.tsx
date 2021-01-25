/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { DiscoverLegacy } from './discover_legacy';
import { inspectorPluginMock } from '../../../../inspector/public/mocks';
import { esHits } from '../../__mocks__/es_hits';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { getTopNavLinks } from './top_nav/get_top_nav_links';
import { DiscoverServices } from '../../build_services';
import { GetStateReturn } from '../angular/discover_state';
import { savedSearchMock } from '../../__mocks__/saved_search';
import { createSearchSourceMock } from '../../../../data/common/search/search_source/mocks';
import { dataPluginMock } from '../../../../data/public/mocks';
import { createFilterManagerMock } from '../../../../data/public/query/filter_manager/filter_manager.mock';
import { uiSettingsMock } from '../../__mocks__/ui_settings';
import { IndexPattern, IndexPatternAttributes } from '../../../../data/common/index_patterns';
import { SavedObject } from '../../../../../core/types';
import { navigationPluginMock } from '../../../../navigation/public/mocks';
import { indexPatternWithTimefieldMock } from '../../__mocks__/index_pattern_with_timefield';
import { calcFieldCounts } from '../helpers/calc_field_counts';

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
    }),
  };
});

function getProps(indexPattern: IndexPattern) {
  const searchSourceMock = createSearchSourceMock({});
  const state = ({} as unknown) as GetStateReturn;
  const services = ({
    capabilities: {
      discover: {
        save: true,
      },
    },
  } as unknown) as DiscoverServices;

  return {
    fetch: jest.fn(),
    fetchCounter: 0,
    fetchError: undefined,
    fieldCounts: calcFieldCounts({}, esHits, indexPattern),
    hits: esHits.length,
    indexPattern,
    minimumVisibleRows: 10,
    onAddColumn: jest.fn(),
    onAddFilter: jest.fn(),
    onChangeInterval: jest.fn(),
    onMoveColumn: jest.fn(),
    onRemoveColumn: jest.fn(),
    onSetColumns: jest.fn(),
    onSkipBottomButtonClick: jest.fn(),
    onSort: jest.fn(),
    opts: {
      config: uiSettingsMock,
      data: dataPluginMock.createStartContract(),
      fixedScroll: jest.fn(),
      filterManager: createFilterManagerMock(),
      indexPatternList: (indexPattern as unknown) as Array<SavedObject<IndexPatternAttributes>>,
      sampleSize: 10,
      savedSearch: savedSearchMock,
      setHeaderActionMenu: jest.fn(),
      timefield: indexPattern.timeFieldName || '',
      setAppState: jest.fn(),
    },
    resetQuery: jest.fn(),
    resultState: 'ready',
    rows: esHits,
    searchSource: searchSourceMock,
    setIndexPattern: jest.fn(),
    showSaveQuery: true,
    state: { columns: [] },
    timefilterUpdateHandler: jest.fn(),
    topNavMenu: getTopNavLinks({
      getFieldCounts: jest.fn(),
      indexPattern,
      inspectorAdapters: inspectorPluginMock,
      navigateTo: jest.fn(),
      savedSearch: savedSearchMock,
      services,
      state,
    }),
    updateQuery: jest.fn(),
    updateSavedQueryId: jest.fn(),
  };
}

describe('Descover legacy component', () => {
  test('selected index pattern without time field displays no chart toggle', () => {
    const component = shallowWithIntl(<DiscoverLegacy {...getProps(indexPatternMock)} />);
    expect(component.find('[data-test-subj="discoverChartToggle"]').length).toBe(0);
  });
  test('selected index pattern with time field displays chart toggle', () => {
    const component = shallowWithIntl(
      <DiscoverLegacy {...getProps(indexPatternWithTimefieldMock)} />
    );
    expect(component.find('[data-test-subj="discoverChartToggle"]').length).toBe(1);
  });
});
