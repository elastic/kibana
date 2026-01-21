/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, within } from '@testing-library/react';
import { HitsCounter, HitsCounterMode } from './hits_counter';
import { BehaviorSubject } from 'rxjs';
import { getDiscoverStateMock } from '../../__mocks__/discover_state.mock';
import type {
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
    const component1 = renderWithI18n(
      <HitsCounter mode={HitsCounterMode.appended} stateContainer={stateContainer} />
    );

    expect(screen.getByTestId('discoverQueryHits')).toHaveTextContent('1');
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('1');
    expect(screen.getAllByTestId('discoverQueryHits').length).toBe(1);

    component1.unmount();

    const component2 = renderWithI18n(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );
    expect(screen.getByTestId('discoverQueryHits')).toHaveTextContent('1');
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('1 result');
    expect(screen.getAllByTestId('discoverQueryHits').length).toBe(1);

    component2.unmount();
  });

  it('expect to render 1,899 hits if 1899 hits given', function () {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: 1899,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$();
    const component1 = renderWithI18n(
      <HitsCounter mode={HitsCounterMode.appended} stateContainer={stateContainer} />
    );
    expect(screen.getByTestId('discoverQueryHits')).toHaveTextContent('1,899');
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('1,899');

    component1.unmount();

    const component2 = renderWithI18n(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );
    expect(screen.getByTestId('discoverQueryHits')).toHaveTextContent('1,899');
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('1,899 results');

    component2.unmount();
  });

  it('renders with custom hit counter labels', function () {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: 1899,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$();

    const component1 = renderWithI18n(
      <HitsCounter
        mode={HitsCounterMode.appended}
        stateContainer={stateContainer}
        hitCounterLabel="kibanana"
        hitCounterPluralLabel="kibananas"
      />
    );
    expect(screen.getByTestId('discoverQueryHits')).toHaveTextContent('1,899');
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('1,899');

    component1.unmount();

    const component2 = renderWithI18n(
      <HitsCounter
        mode={HitsCounterMode.standalone}
        stateContainer={stateContainer}
        hitCounterLabel="kibanana"
        hitCounterPluralLabel="kibananas"
      />
    );
    expect(screen.getByTestId('discoverQueryHits')).toHaveTextContent('1,899');
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('1,899 kibananas');

    component2.unmount();

    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: 1,
    }) as DataTotalHits$;

    const component3 = renderWithI18n(
      <HitsCounter
        mode={HitsCounterMode.standalone}
        stateContainer={stateContainer}
        hitCounterLabel="kibanana"
        hitCounterPluralLabel="kibananas"
      />
    );
    expect(screen.getByTestId('discoverQueryHits')).toHaveTextContent('1');
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('1 kibanana');

    component3.unmount();
  });

  it('should render a EuiLoadingSpinner when status is partial', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.PARTIAL,
      result: 2,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$();
    const component = renderWithI18n(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );

    const progressElement = within(component.container).getAllByRole('progressbar');

    expect(progressElement.length).toBe(1);
    expect(progressElement[0]).toHaveClass('euiLoadingSpinner');
  });

  it('should render discoverQueryHitsPartial when status is partial', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.PARTIAL,
      result: 2,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$();
    renderWithI18n(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );
    expect(screen.queryByTestId('discoverQueryHitsPartial')).toBeInTheDocument();
    expect(screen.queryByTestId('discoverQueryTotalHits')).toHaveTextContent('≥2 results');
  });

  it('should not render if loading', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.LOADING,
      result: undefined,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$();
    const component = renderWithI18n(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );

    expect(component.container).toBeEmptyDOMElement();
  });

  it('should render discoverQueryHitsPartial when status is error', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.ERROR,
      result: undefined,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$(3);
    const component = renderWithI18n(
      <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
    );
    expect(screen.getByTestId('discoverQueryHitsPartial')).toBeInTheDocument();
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('≥3 resultsInfo');

    component.unmount();

    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.ERROR,
      result: 200,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$(2);

    const component2 = renderWithI18n(
      <HitsCounter mode={HitsCounterMode.appended} stateContainer={stateContainer} />
    );
    expect(screen.getByTestId('discoverQueryHitsPartial')).toBeInTheDocument();
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('≥200Info');

    component2.unmount();

    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.ERROR,
      result: 0,
    }) as DataTotalHits$;
    stateContainer.dataState.data$.documents$ = getDocuments$(1);

    const component3 = renderWithI18n(
      <HitsCounter mode={HitsCounterMode.appended} stateContainer={stateContainer} />
    );
    expect(screen.getByTestId('discoverQueryHitsPartial')).toBeInTheDocument();
    expect(screen.getByTestId('discoverQueryTotalHits')).toHaveTextContent('≥1Info');

    component3.unmount();
  });
});
