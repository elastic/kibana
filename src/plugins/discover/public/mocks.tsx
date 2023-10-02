/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { DiscoverSetup, DiscoverStart } from '.';
import { getDiscoverStateMock } from './__mocks__/discover_state.mock';

export type Setup = jest.Mocked<DiscoverSetup>;
export type Start = jest.Mocked<DiscoverStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    locator: sharePluginMock.createLocator(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    locator: sharePluginMock.createLocator(),
    DiscoverContainer: jest.fn().mockImplementation(() => <></>),
    registerCustomizationProfile: jest.fn(),
  };
  return startContract;
};

export const discoverPluginMock = {
  createSetupContract,
  createStartContract,
  getDiscoverStateMock,
};
