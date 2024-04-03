/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { HitsCounter, HitsCounterMode } from './hits_counter';
import { findTestSubject } from '@elastic/eui/lib/test';
import { EuiLoadingSpinner } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import { getDiscoverStateMock } from '../../__mocks__/discover_state.mock';
import { DataTotalHits$ } from '../../application/main/services/discover_data_state_container';
import { FetchStatus } from '../../application/types';

describe('hits counter', function () {
  it('expect to render the number of hits', function () {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: 1,
    }) as DataTotalHits$;
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
    const component = mountWithIntl(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );
    expect(component.isEmptyRender()).toBe(true);
  });
});
