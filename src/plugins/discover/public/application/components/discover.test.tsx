/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subject, BehaviorSubject } from 'rxjs';
import { mountWithIntl } from '@kbn/test/jest';
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
import { indexPatternWithTimefieldMock } from '../../__mocks__/index_pattern_with_timefield';
import { fetchStatuses } from './constants';
import { UseSavedSearch } from './use_saved_search';
import { DiscoverSearchSessionManager } from '../angular/discover_search_session';
import { GetStateReturn } from '../angular/discover_state';
import { DataPublicPluginStart } from '../../../../data/public';
import { TopNavMenu } from '../../../../navigation/public/top_nav_menu';

setHeaderActionMenuMounter(jest.fn());

function getProps(indexPattern: IndexPattern) {
  const searchSourceMock = createSearchSourceMock({});
  const services = ({
    data: {
      query: {
        timefilter: {
          timefilter: {
            getTime: () => {
              return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
            },
          },
        },
      },
    } as DataPublicPluginStart,
    metadata: {
      branch: 'test',
    },
    timefilter: {
      createFilter: jest.fn(),
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
    navigation: {
      ui: { TopNavMenu },
    },
  } as unknown) as DiscoverServices;

  const useSavedSearchMock = ({
    rows: esHits,
    fetchStatus: fetchStatuses.COMPLETE,
    fetch$: new Subject(),
    hits$: new BehaviorSubject({ state: 'success', total: esHits.length }),
    chart$: new BehaviorSubject({ state: 'initial' }),
  } as unknown) as UseSavedSearch;

  const indexPatternList = ([indexPattern].map((ip) => {
    return { ...ip, ...{ attributes: { title: ip.title } } };
  }) as unknown) as Array<SavedObject<IndexPatternAttributes>>;

  return {
    indexPattern,
    opts: {
      indexPatternList,
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
    const component = mountWithIntl(<Discover {...getProps(indexPatternMock)} />);
    expect(component.find('[data-test-subj="discoverChartToggle"]').exists()).toBeFalsy();
  });
  test('selected index pattern with time field displays chart toggle', () => {
    const component = mountWithIntl(<Discover {...getProps(indexPatternWithTimefieldMock)} />);
    expect(component.find('[data-test-subj="discoverChartToggle"]').exists()).toBeTruthy();
  });
});
