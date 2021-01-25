/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { UrlForwardingPlugin } from './plugin';

export type Setup = jest.Mocked<ReturnType<UrlForwardingPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<UrlForwardingPlugin['start']>>;

const createSetupContract = (): Setup => ({
  forwardApp: jest.fn(),
});

const createStartContract = (): Start => ({
  getForwards: jest.fn(),
  navigateToDefaultApp: jest.fn(),
  navigateToLegacyKibanaUrl: jest.fn(),
});

export const urlForwardingPluginMock = {
  createSetupContract,
  createStartContract,
};
