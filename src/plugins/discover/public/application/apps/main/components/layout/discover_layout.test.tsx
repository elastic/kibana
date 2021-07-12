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
import { setHeaderActionMenuMounter } from '../../../../../kibana_services';
import { DiscoverLayout } from './discover_layout';
import { esHits } from '../../../../../__mocks__/es_hits';
import { indexPatternMock } from '../../../../../__mocks__/index_pattern';
import { savedSearchMock } from '../../../../../__mocks__/saved_search';
import { createSearchSourceMock } from '../../../../../../../data/common/search/search_source/mocks';
import { IndexPattern, IndexPatternAttributes } from '../../../../../../../data/common';
import { SavedObject } from '../../../../../../../../core/types';
import { indexPatternWithTimefieldMock } from '../../../../../__mocks__/index_pattern_with_timefield';
import { GetStateReturn } from '../../services/discover_state';
import { DiscoverLayoutProps } from './types';
import { SavedSearchDataSubject } from '../../services/use_saved_search';
import { discoverServiceMock } from '../../../../../__mocks__/services';
import { FetchStatus } from '../../../../types';

setHeaderActionMenuMounter(jest.fn());

function getProps(indexPattern: IndexPattern): DiscoverLayoutProps {
  const searchSourceMock = createSearchSourceMock({});
  const services = discoverServiceMock;
  services.data.query.timefilter.timefilter.getTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const indexPatternList = ([indexPattern].map((ip) => {
    return { ...ip, ...{ attributes: { title: ip.title } } };
  }) as unknown) as Array<SavedObject<IndexPatternAttributes>>;

  const savedSearch$ = new BehaviorSubject({
    state: FetchStatus.COMPLETE,
    rows: esHits,
    fetchCounter: 1,
    fieldCounts: {},
    hits: Number(esHits.length),
  }) as SavedSearchDataSubject;

  return {
    indexPattern,
    indexPatternList,
    navigateTo: jest.fn(),
    onChangeIndexPattern: jest.fn(),
    onUpdateQuery: jest.fn(),
    resetQuery: jest.fn(),
    savedSearch: savedSearchMock,
    savedSearchData$: savedSearch$,
    savedSearchRefetch$: new Subject(),
    searchSource: searchSourceMock,
    services,
    state: { columns: [] },
    stateContainer: {} as GetStateReturn,
  };
}

describe('Discover component', () => {
  test('selected index pattern without time field displays no chart toggle', () => {
    const component = mountWithIntl(<DiscoverLayout {...getProps(indexPatternMock)} />);
    expect(component.find('[data-test-subj="discoverChartToggle"]').exists()).toBeFalsy();
  });
  test('selected index pattern with time field displays chart toggle', () => {
    const component = mountWithIntl(
      <DiscoverLayout {...getProps(indexPatternWithTimefieldMock)} />
    );
    expect(component.find('[data-test-subj="discoverChartToggle"]').exists()).toBeTruthy();
  });
});
