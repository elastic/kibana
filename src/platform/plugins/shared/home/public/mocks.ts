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
import { HomePublicPluginSetup } from './plugin';
import { welcomeServiceMock } from './services/welcome/welcome_service.mocks';

const createSetupContract = (): jest.Mocked<HomePublicPluginSetup> => ({
  featureCatalogue: featureCatalogueRegistryMock.createSetup(),
  environment: environmentServiceMock.createSetup(),
  tutorials: tutorialServiceMock.createSetup(),
  addData: addDataServiceMock.createSetup(),
  welcomeScreen: welcomeServiceMock.createSetup(),
});

export const homePluginMock = {
  createSetupContract,
};
