/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { URL } from 'url';
import { TelemetryPluginStart, TelemetryPluginSetup } from './plugin';

export type Setup = jest.Mocked<TelemetryPluginSetup>;
export type Start = jest.Mocked<TelemetryPluginStart>;

export const telemetryPluginMock = {
  createSetupContract,
  createStartContract,
};

function createSetupContract(): Setup {
  const telemetryUrl = new URL('https://telemetry-staging.elastic.co/xpack/MOCK_URL/send');
  const setupContract: Setup = {
    getTelemetryUrl: jest.fn().mockResolvedValue(telemetryUrl),
  };

  return setupContract;
}

function createStartContract(): Start {
  const startContract: Start = {
    getIsOptedIn: jest.fn(),
  };

  return startContract;
}
