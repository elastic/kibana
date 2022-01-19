/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EngagementPluginSetup, EngagementPluginStart } from './types';

function createEngagementPluginSetup(): jest.Mocked<EngagementPluginSetup> {
  const mock: jest.Mocked<EngagementPluginSetup> = {};
  return mock;
}

function createEngagementPluginStart(): jest.Mocked<EngagementPluginStart> {
  return {
    ContextProvider: jest.fn(),
  };
}

export const engagementMock = {
  createSetup: createEngagementPluginSetup,
  createStart: createEngagementPluginStart,
};
