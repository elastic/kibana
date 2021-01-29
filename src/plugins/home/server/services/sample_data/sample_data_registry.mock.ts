/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  SampleDataRegistrySetup,
  SampleDataRegistryStart,
  SampleDataRegistry,
} from './sample_data_registry';

const createSetupMock = (): jest.Mocked<SampleDataRegistrySetup> => {
  const setup = {
    registerSampleDataset: jest.fn(),
    getSampleDatasets: jest.fn(),
    addSavedObjectsToSampleDataset: jest.fn(),
    addAppLinksToSampleDataset: jest.fn(),
    replacePanelInSampleDatasetDashboard: jest.fn(),
  };
  return setup;
};

const createStartMock = (): jest.Mocked<SampleDataRegistryStart> => {
  const start = {};
  return start;
};

const createMock = (): jest.Mocked<PublicMethodsOf<SampleDataRegistry>> => {
  const service = {
    setup: jest.fn(),
    start: jest.fn(),
  };
  service.setup.mockImplementation(createSetupMock);
  service.start.mockImplementation(createStartMock);
  return service;
};

export const sampleDataRegistryMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
  create: createMock,
};
