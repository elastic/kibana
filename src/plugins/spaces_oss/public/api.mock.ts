/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import { SpacesApi, SpacesApiUi, SpacesApiUiComponent } from './api';

const createApiMock = (): jest.Mocked<SpacesApi> => ({
  activeSpace$: of(),
  getActiveSpace: jest.fn(),
  ui: createApiUiMock(),
});

type SpacesApiUiMock = Omit<jest.Mocked<SpacesApiUi>, 'components'> & {
  components: SpacesApiUiComponentMock;
};

const createApiUiMock = () => {
  const mock: SpacesApiUiMock = {
    components: createApiUiComponentsMock(),
  };

  return mock;
};

type SpacesApiUiComponentMock = jest.Mocked<SpacesApiUiComponent>;

const createApiUiComponentsMock = () => {
  const mock: SpacesApiUiComponentMock = {
    SpacesContext: jest.fn(),
    ShareToSpaceFlyout: jest.fn(),
    SpaceList: jest.fn(),
  };

  return mock;
};

export const spacesApiMock = {
  create: createApiMock,
};
