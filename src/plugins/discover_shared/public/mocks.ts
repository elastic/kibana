/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createDiscoverFeaturesServiceSetupMock,
  createDiscoverFeaturesServiceStartMock,
} from './services/discover_features/discover_features_service.mock';
import { DiscoverSharedPublicSetup, DiscoverSharedPublicStart } from './types';

export type Setup = jest.Mocked<DiscoverSharedPublicSetup>;
export type Start = jest.Mocked<DiscoverSharedPublicStart>;

const createSetupContract = (): Setup => {
  return {
    features: createDiscoverFeaturesServiceSetupMock(),
  };
};

const createStartContract = (): Start => {
  return {
    features: createDiscoverFeaturesServiceStartMock(),
  };
};

export const discoverSharedPluginMock = {
  createSetupContract,
  createStartContract,
};
