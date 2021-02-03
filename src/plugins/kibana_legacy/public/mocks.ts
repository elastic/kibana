/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { KibanaLegacyPlugin } from './plugin';

export type Setup = jest.Mocked<ReturnType<KibanaLegacyPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<KibanaLegacyPlugin['start']>>;

const createSetupContract = (): Setup => ({});

const createStartContract = (): Start => ({
  config: {
    defaultAppId: 'home',
  },
  dashboardConfig: {
    turnHideWriteControlsOn: jest.fn(),
    getHideWriteControls: jest.fn(),
  },
  loadFontAwesome: jest.fn(),
});

export const kibanaLegacyPluginMock = {
  createSetupContract,
  createStartContract,
};
