/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { capabilitiesServiceMock } from './capabilities/capabilities_service.mock';

export const MockCapabilitiesService = capabilitiesServiceMock.create();
export const CapabilitiesServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockCapabilitiesService);
jest.doMock('./capabilities', () => ({
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
jest.doMock('./utils', () => {
  const original = jest.requireActual('./utils');

  return {
    ...original,
    parseAppUrl: parseAppUrlMock,
  };
});
