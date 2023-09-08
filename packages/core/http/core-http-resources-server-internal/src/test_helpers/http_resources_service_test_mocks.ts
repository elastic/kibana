/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpResourcesServiceToolkit } from '@kbn/core-http-resources-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';

// partial duplicate of coreMock
export function createCoreRequestHandlerContextMock() {
  return {
    core: {
      uiSettings: {
        client: uiSettingsServiceMock.createClient(),
        globalClient: uiSettingsServiceMock.createClient(),
      },
    },
  };
}

// duplicate of public mock for internal testing only
export function createHttpResourcesResponseFactory() {
  const mocked: jest.Mocked<HttpResourcesServiceToolkit> = {
    renderCoreApp: jest.fn(),
    renderAnonymousCoreApp: jest.fn(),
    renderHtml: jest.fn(),
    renderCss: jest.fn(),
    renderJs: jest.fn(),
  };

  return {
    ...httpServerMock.createResponseFactory(),
    ...mocked,
  };
}
