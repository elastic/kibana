/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { capabilitiesServiceMock } from '@kbn/core-capabilities-browser-mocks';
import { Observable } from 'rxjs';

export const MockCapabilitiesService = capabilitiesServiceMock.create();
export const CapabilitiesServiceConstructor = vi
  .fn()
  .mockImplementation(() => MockCapabilitiesService);
vi.doMock('@kbn/core-capabilities-browser-internal', () => {
  const mocked = {
    CapabilitiesService: CapabilitiesServiceConstructor,
  };
  return { ...mocked, default: mocked };
});

export const MockHistory = {
  push: vi.fn(),
  replace: vi.fn(),
};
export const createBrowserHistoryMock = vi.fn().mockReturnValue(MockHistory);
vi.doMock('history', () => {
  const mocked = {
    createBrowserHistory: createBrowserHistoryMock,
  };
  return { ...mocked, default: mocked };
});

export const parseAppUrlMock = vi.fn();
export const getLocationObservableMock = vi.fn(() => new Observable());
vi.doMock('./utils', async () => {
  const original = await vi.importActual('./utils');

  return {
    ...original,
    parseAppUrl: parseAppUrlMock,
    getLocationObservable: getLocationObservableMock,
  };
});

export const registerAnalyticsContextProviderMock = vi.fn();
vi.doMock('./register_analytics_context_provider', async () => {
  const original = await vi.importActual('./register_analytics_context_provider');

  return {
    ...original,
    registerAnalyticsContextProvider: registerAnalyticsContextProviderMock,
  };
});

window.performance.mark = vi.fn();
