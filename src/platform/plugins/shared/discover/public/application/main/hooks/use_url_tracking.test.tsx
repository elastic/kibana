/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useUrlTracking } from './use_url_tracking';
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';
import { DiscoverServices } from '../../../build_services';
import { DiscoverStateContainer } from '../state_management/discover_state';
import { omit } from 'lodash';
import { createSavedSearchAdHocMock, createSavedSearchMock } from '../../../__mocks__/saved_search';

const renderUrlTracking = ({
  services,
  stateContainer,
}: {
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
}) =>
  renderHook(useUrlTracking, {
    initialProps: stateContainer,
    wrapper: ({ children }) => (
      <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
    ),
  });

describe('useUrlTracking', () => {
  it('should enable URL tracking for a persisted data view', () => {
    const services = createDiscoverServicesMock();
    const savedSearch = omit(createSavedSearchMock(), 'id');
    const stateContainer = getDiscoverStateMock({ savedSearch });
    expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
    renderUrlTracking({ services, stateContainer });
    expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
  });

  it('should disable URL tracking for an ad hoc data view', () => {
    const services = createDiscoverServicesMock();
    const savedSearch = omit(createSavedSearchAdHocMock(), 'id');
    const stateContainer = getDiscoverStateMock({ savedSearch });
    expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
    renderUrlTracking({ services, stateContainer });
    expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(false);
  });

  it('should enable URL tracking if the ad hoc data view is a default profile data view', () => {
    const services = createDiscoverServicesMock();
    const savedSearch = omit(createSavedSearchAdHocMock(), 'id');
    const stateContainer = getDiscoverStateMock({ savedSearch });
    stateContainer.internalState.transitions.setDefaultProfileAdHocDataViews([
      savedSearch.searchSource.getField('index')!,
    ]);
    expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
    renderUrlTracking({ services, stateContainer });
    expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
  });

  it('should enable URL tracking with an ad hoc data view if in ES|QL mode', () => {
    const services = createDiscoverServicesMock();
    const savedSearch = omit(createSavedSearchAdHocMock(), 'id');
    savedSearch.searchSource.setField('query', { esql: 'FROM test' });
    const stateContainer = getDiscoverStateMock({ savedSearch });
    expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
    renderUrlTracking({ services, stateContainer });
    expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
  });

  it('should enable URL tracking with an ad hoc data view if the saved search has an ID (persisted)', () => {
    const services = createDiscoverServicesMock();
    const savedSearch = createSavedSearchAdHocMock();
    const stateContainer = getDiscoverStateMock({ savedSearch });
    expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
    renderUrlTracking({ services, stateContainer });
    expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
  });
});
