/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { capabilitiesServiceMock } from '@kbn/core-capabilities-browser-mocks';
import { Observable } from 'rxjs';

export const MockCapabilitiesService = capabilitiesServiceMock.create();
export const CapabilitiesServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockCapabilitiesService);
jest.doMock('@kbn/core-capabilities-browser-internal', () => ({
  CapabilitiesService: CapabilitiesServiceConstructor,
}));

export const MockHistory = {
  push: jest.fn(),
  replace: jest.fn(),
};
export const createBrowserHistoryMock = jest.fn().mockReturnValue(MockHistory);
jest.doMock('history', () => ({
  createBrowserHistory: createBrowserHistoryMock,
}));

export const parseAppUrlMock = jest.fn();
export const getLocationObservableMock = jest.fn(() => new Observable());
jest.doMock('./utils', () => {
  const original = jest.requireActual('./utils');

  return {
    ...original,
    parseAppUrl: parseAppUrlMock,
    getLocationObservable: getLocationObservableMock,
  };
});

export const registerAnalyticsContextProviderMock = jest.fn();
jest.doMock('./register_analytics_context_provider', () => {
  const original = jest.requireActual('./register_analytics_context_provider');

  return {
    ...original,
    registerAnalyticsContextProvider: registerAnalyticsContextProviderMock,
  };
});
