/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { internalStateActions } from '..';

describe('data availability', () => {
  it('waits for data when the data view check finishes negative first', async () => {
    const { internalState, services } = getDiscoverInternalStateMock();
    const esData = Promise.withResolvers<boolean>();
    jest.mocked(services.dataViews.hasData.hasESData).mockReturnValue(esData.promise);
    jest.mocked(services.dataViews.hasData.hasDataView).mockResolvedValue(false);
    jest.mocked(services.core.http.get).mockResolvedValue({ datasets: [] });
    const onAvailable = jest.fn();
    const availabilityRequest = internalState
      .dispatch(internalStateActions.loadDataAvailabilityOnce())
      .then(onAvailable);

    await internalState.dispatch(internalStateActions.loadDataViewAvailabilityOnce());

    expect(onAvailable).not.toHaveBeenCalled();

    esData.resolve(true);
    await availabilityRequest;

    expect(onAvailable).toHaveBeenCalledWith({ hasESData: true, hasDataView: false });
  });

  it('waits for the data view check when the tab needs a data view', async () => {
    const { internalState, services } = getDiscoverInternalStateMock();
    const dataViews = Promise.withResolvers<boolean>();

    jest.mocked(services.dataViews.hasData.hasESData).mockResolvedValue(true);
    jest.mocked(services.dataViews.hasData.hasDataView).mockReturnValue(dataViews.promise);
    jest.mocked(services.core.http.get).mockResolvedValue({ datasets: [] });

    const availabilityRequest = internalState.dispatch(
      internalStateActions.loadDataAvailabilityOnce({ needsDataView: true })
    );
    await internalState.dispatch(internalStateActions.loadESDataAvailabilityOnce());
    dataViews.resolve(true);

    await expect(availabilityRequest).resolves.toEqual({ hasESData: true, hasDataView: true });
  });

  it('shares each request, counts ES|QL datasets as data and resolves the checks independently', async () => {
    const { internalState, services } = getDiscoverInternalStateMock();
    const dataViews = Promise.withResolvers<boolean>();
    jest.mocked(services.dataViews.hasData.hasESData).mockResolvedValue(false);
    jest.mocked(services.dataViews.hasData.hasDataView).mockReturnValue(dataViews.promise);
    jest.mocked(services.core.http.get).mockResolvedValue({ datasets: [{ name: 'dataset' }] });

    const dataViewRequest = internalState.dispatch(
      internalStateActions.loadDataViewAvailabilityOnce()
    );
    const concurrentDataViewRequest = internalState.dispatch(
      internalStateActions.loadDataViewAvailabilityOnce()
    );
    const esDataRequest = internalState.dispatch(internalStateActions.loadESDataAvailabilityOnce());
    const concurrentESDataRequest = internalState.dispatch(
      internalStateActions.loadESDataAvailabilityOnce()
    );

    await expect(esDataRequest).resolves.toBe(true);
    await expect(concurrentESDataRequest).resolves.toBe(true);

    dataViews.resolve(false);
    await expect(dataViewRequest).resolves.toBe(false);
    await expect(concurrentDataViewRequest).resolves.toBe(false);
    expect(services.dataViews.hasData.hasESData).toHaveBeenCalledTimes(1);
    expect(services.dataViews.hasData.hasDataView).toHaveBeenCalledTimes(1);
    expect(services.core.http.get).toHaveBeenCalledTimes(1);
    expect(internalState.getState().initializationState).toEqual({
      hasESData: true,
      hasDataView: false,
    });
  });

  it('returns updated availability after data view creation without repeating the checks', async () => {
    const { internalState, services } = getDiscoverInternalStateMock();
    jest.mocked(services.dataViews.hasData.hasESData).mockResolvedValue(false);
    jest.mocked(services.dataViews.hasData.hasDataView).mockResolvedValue(false);
    jest.mocked(services.core.http.get).mockResolvedValue({ datasets: [] });

    await expect(
      internalState.dispatch(internalStateActions.loadESDataAvailabilityOnce())
    ).resolves.toBe(false);
    await expect(
      internalState.dispatch(internalStateActions.loadDataViewAvailabilityOnce())
    ).resolves.toBe(false);

    internalState.dispatch(
      internalStateActions.setInitializationState({ hasESData: true, hasDataView: true })
    );

    await expect(
      internalState.dispatch(internalStateActions.loadESDataAvailabilityOnce())
    ).resolves.toBe(true);
    await expect(
      internalState.dispatch(internalStateActions.loadDataViewAvailabilityOnce())
    ).resolves.toBe(true);
    expect(services.dataViews.hasData.hasESData).toHaveBeenCalledTimes(1);
    expect(services.dataViews.hasData.hasDataView).toHaveBeenCalledTimes(1);
    expect(services.core.http.get).toHaveBeenCalledTimes(1);
  });
});
