/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { HitsCounter, HitsCounterMode } from './hits_counter';
import { findTestSubject } from '@elastic/eui/lib/test';
import { EuiLoadingSpinner } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import { getDiscoverStateMock } from '../../__mocks__/discover_state.mock';
import {
  DataDocuments$,
  DataTotalHits$,
} from '../../application/main/state_management/discover_data_state_container';
import { FetchStatus } from '../../application/types';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';

function getDocuments$(count: number = 5) {
  return new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: esHitsMock.map((esHit) => buildDataTableRecord(esHit, dataViewMock)).slice(0, count),
  }) as DataDocuments$;
}

describe('hits counter', function () {
  it('expect to render the number of hits', function () {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: 1,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$();
    const component1 = mountWithIntl(
      <HitsCounter mode={HitsCounterMode.appended} stateContainer={stateContainer} />
    );
    expect(findTestSubject(component1, 'discoverQueryHits').text()).toBe('1');
    expect(findTestSubject(component1, 'discoverQueryTotalHits').text()).toBe('1');
    expect(component1.find('[data-test-subj="discoverQueryHits"]').length).toBe(1);

    const component2 = mountWithIntl(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );
    expect(findTestSubject(component2, 'discoverQueryHits').text()).toBe('1');
    expect(findTestSubject(component2, 'discoverQueryTotalHits').text()).toBe('1 result');
    expect(component2.find('[data-test-subj="discoverQueryHits"]').length).toBe(1);
  });

  it('expect to render 1,899 hits if 1899 hits given', function () {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: 1899,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$();
    const component1 = mountWithIntl(
      <HitsCounter mode={HitsCounterMode.appended} stateContainer={stateContainer} />
    );
    expect(findTestSubject(component1, 'discoverQueryHits').text()).toBe('1,899');
    expect(findTestSubject(component1, 'discoverQueryTotalHits').text()).toBe('1,899');

    const component2 = mountWithIntl(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );
    expect(findTestSubject(component2, 'discoverQueryHits').text()).toBe('1,899');
    expect(findTestSubject(component2, 'discoverQueryTotalHits').text()).toBe('1,899 results');
  });

  it('should render a EuiLoadingSpinner when status is partial', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.PARTIAL,
      result: 2,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$();
    const component = mountWithIntl(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );
    expect(component.find(EuiLoadingSpinner).length).toBe(1);
  });

  it('should render discoverQueryHitsPartial when status is partial', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.PARTIAL,
      result: 2,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$();
    const component = mountWithIntl(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );
    expect(component.find('[data-test-subj="discoverQueryHitsPartial"]').length).toBe(1);
    expect(findTestSubject(component, 'discoverQueryTotalHits').text()).toBe('≥2 results');
  });

  it('should not render if loading', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.LOADING,
      result: undefined,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$();
    const component = mountWithIntl(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );
    expect(component.isEmptyRender()).toBe(true);
  });

  it('should render discoverQueryHitsPartial when status is error', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.ERROR,
      result: undefined,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$(3);
    const component = mountWithIntl(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );
    expect(component.find('[data-test-subj="discoverQueryHitsPartial"]').length).toBe(1);
    expect(findTestSubject(component, 'discoverQueryTotalHits').text()).toBe('≥3 resultsInfo');
    expect(component.text()).toBe('≥3 resultsInfo');

    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.ERROR,
      result: 200,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$(2);

    const component2 = mountWithIntl(
      <HitsCounter mode={HitsCounterMode.appended} stateContainer={stateContainer} />
    );
    expect(component2.find('[data-test-subj="discoverQueryHitsPartial"]').length).toBe(1);
    expect(findTestSubject(component2, 'discoverQueryTotalHits').text()).toBe('≥200Info');
    expect(component2.text()).toBe(' (≥200Info)');

    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.ERROR,
      result: 0,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$(1);

    const component3 = mountWithIntl(
      <HitsCounter mode={HitsCounterMode.appended} stateContainer={stateContainer} />
    );
    expect(component3.find('[data-test-subj="discoverQueryHitsPartial"]').length).toBe(1);
    expect(findTestSubject(component3, 'discoverQueryTotalHits').text()).toBe('≥1Info');
    expect(component3.text()).toBe(' (≥1Info)');
  });
});
