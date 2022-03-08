/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  TelemetryCollectionManagerPluginSetup,
  TelemetryCollectionManagerPluginStart,
} from './types';

export type Setup = jest.Mocked<TelemetryCollectionManagerPluginSetup>;
export type Start = jest.Mocked<TelemetryCollectionManagerPluginStart>;

export const telemetryCollectionManagerPluginMock = {
  createSetupContract,
  createStartContract,
};

function createSetupContract(): Setup {
  const setupContract: Setup = {
    getStats: jest.fn(),
    getOptInStats: jest.fn(),
    setCollectionStrategy: jest.fn(),
  };

  return setupContract;
}

function createStartContract(): Start {
  const startContract: Start = {
    getOptInStats: jest.fn(),
    getStats: jest.fn(),
  };

  return startContract;
}
