/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';

import type { SpacesApi, SpacesApiUi, SpacesApiUiComponent } from './api';

const createApiMock = (): jest.Mocked<SpacesApi> => ({
  getActiveSpace$: jest.fn().mockReturnValue(of()),
  getActiveSpace: jest.fn(),
  ui: createApiUiMock(),
});

type SpacesApiUiMock = Omit<jest.Mocked<SpacesApiUi>, 'components'> & {
  components: SpacesApiUiComponentMock;
};

const createApiUiMock = () => {
  const mock: SpacesApiUiMock = {
    components: createApiUiComponentsMock(),
    redirectLegacyUrl: jest.fn(),
  };

  return mock;
};

type SpacesApiUiComponentMock = jest.Mocked<SpacesApiUiComponent>;

const createApiUiComponentsMock = () => {
  const mock: SpacesApiUiComponentMock = {
    getSpacesContextProvider: jest.fn(),
    getShareToSpaceFlyout: jest.fn(),
    getSpaceList: jest.fn(),
    getLegacyUrlConflict: jest.fn(),
    getSpaceAvatar: jest.fn(),
  };

  return mock;
};

export const spacesApiMock = {
  create: createApiMock,
};
