/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sampleDataRegistryMock } from './services/sample_data/sample_data_registry.mock';
import { tutorialsRegistryMock } from './services/tutorials/tutorials_registry.mock';

export const registryForTutorialsMock = tutorialsRegistryMock.create();
export const registryForSampleDataMock = sampleDataRegistryMock.create();
jest.doMock('./services', () => ({
  TutorialsRegistry: jest.fn(() => registryForTutorialsMock),
  SampleDataRegistry: jest.fn(() => registryForSampleDataMock),
}));
