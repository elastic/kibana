/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { featureCatalogueRegistryMock } from './services/feature_catalogue/feature_catalogue_registry.mock';
import { environmentServiceMock } from './services/environment/environment.mock';
import { tutorialServiceMock } from './services/tutorials/tutorial_service.mock';

export const registryMock = featureCatalogueRegistryMock.create();
export const environmentMock = environmentServiceMock.create();
export const tutorialMock = tutorialServiceMock.create();
jest.doMock('./services', () => ({
  FeatureCatalogueRegistry: jest.fn(() => registryMock),
  EnvironmentService: jest.fn(() => environmentMock),
  TutorialService: jest.fn(() => tutorialMock),
}));
