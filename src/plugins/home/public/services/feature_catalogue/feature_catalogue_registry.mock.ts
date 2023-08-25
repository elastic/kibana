/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import * as Rx from 'rxjs';
import {
  FeatureCatalogueRegistrySetup,
  FeatureCatalogueRegistry,
} from './feature_catalogue_registry';

const createSetupMock = (): jest.Mocked<FeatureCatalogueRegistrySetup> => {
  const setup = {
    register: jest.fn(),
    registerSolution: jest.fn(),
  };
  return setup;
};

const createMock = (): jest.Mocked<PublicMethodsOf<FeatureCatalogueRegistry>> => {
  const service = {
    setup: jest.fn(),
    start: jest.fn(),
    get: jest.fn(() => []),
    getFeatures$: jest.fn(() => Rx.of([])),
    getSolutions: jest.fn(() => []),
    removeFeature: jest.fn(),
  };
  service.setup.mockImplementation(createSetupMock);
  return service;
};

export const featureCatalogueRegistryMock = {
  createSetup: createSetupMock,
  create: createMock,
};
