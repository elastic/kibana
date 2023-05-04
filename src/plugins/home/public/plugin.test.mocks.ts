/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { featureCatalogueRegistryMock } from './services/feature_catalogue/feature_catalogue_registry.mock';
import { environmentServiceMock } from './services/environment/environment.mock';
import { tutorialServiceMock } from './services/tutorials/tutorial_service.mock';
import { addDataServiceMock } from './services/add_data/add_data_service.mock';
import { welcomeServiceMock } from './services/welcome/welcome_service.mocks';

export const registryMock = featureCatalogueRegistryMock.create();
export const environmentMock = environmentServiceMock.create();
export const tutorialMock = tutorialServiceMock.create();
export const addDataMock = addDataServiceMock.create();
export const welcomeMock = welcomeServiceMock.create();
jest.doMock('./services', () => ({
  FeatureCatalogueRegistry: jest.fn(() => registryMock),
  EnvironmentService: jest.fn(() => environmentMock),
  TutorialService: jest.fn(() => tutorialMock),
  AddDataService: jest.fn(() => addDataMock),
  WelcomeService: jest.fn(() => welcomeMock),
}));
